/**
 * Mint Medical Clinic - Shipping dashboard API
 *
 * Reads orders from Snipcart for the admin Orders tab, and marks orders
 * shipped. Every call requires a valid admin session token (the same
 * sessions admin-auth.js issues).
 *
 * Env: SNIPCART_SECRET_KEY — a Snipcart *secret* API key (Dashboard →
 * Account → API Keys). Never expose it to the browser.
 */

const { getStore } = require('@netlify/blobs');

const SNIPCART_API = 'https://app.snipcart.com/api';
const PAGE_SIZE = 50;
// Statuses an admin may set from the dashboard. Snipcart accepts more, but
// these are the only transitions the shipping workflow needs.
const SETTABLE_STATUSES = ['Processed', 'Shipped', 'Delivered'];

function getBlobStore(name) {
    try {
        return getStore(name);
    } catch (e) {
        if (process.env.NETLIFY_AUTH_TOKEN) {
            return getStore({
                name: name,
                siteID: process.env.SITE_ID || '38e7c65c-9693-4bec-9e83-e2312bd923db',
                token: process.env.NETLIFY_AUTH_TOKEN
            });
        }
        throw e;
    }
}

async function validSession(token) {
    if (!token) return false;
    const session = await getBlobStore('admin-sessions').get(token, { type: 'json' });
    return !!session && new Date(session.expiresAt) >= new Date();
}

async function snipcart(path, options = {}) {
    const key = process.env.SNIPCART_SECRET_KEY;
    const res = await fetch(SNIPCART_API + path, {
        ...options,
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: 'Basic ' + Buffer.from(key + ':').toString('base64')
        }
    });
    if (!res.ok) {
        const err = new Error('Snipcart ' + res.status);
        err.status = res.status;
        throw err;
    }
    return res.json();
}

function mapAddress(a) {
    if (!a) return null;
    return {
        name: a.fullName || a.name || '',
        company: a.company || '',
        address1: a.address1 || '',
        address2: a.address2 || '',
        city: a.city || '',
        province: a.province || '',
        postalCode: a.postalCode || '',
        country: a.country || '',
        phone: a.phone || ''
    };
}

// Only the fields the dashboard shows. Card details and anything else
// Snipcart returns stay on the server.
function mapOrder(o) {
    const method = o.shippingMethod || (o.shippingInformation && o.shippingInformation.method) || '';
    return {
        token: o.token,
        invoiceNumber: o.invoiceNumber,
        createdAt: o.creationDate,
        completedAt: o.completionDate,
        status: o.status,
        paymentStatus: o.paymentStatus,
        email: o.email,
        total: o.finalGrandTotal != null ? o.finalGrandTotal : o.grandTotal,
        currency: o.currency,
        shippingMethod: method,
        isPickup: /pick\s*up/i.test(method),
        shippingFees: o.shippingFees,
        trackingNumber: o.trackingNumber || '',
        trackingUrl: o.trackingUrl || '',
        discounts: (o.discounts || []).map((d) => d.code || d.name).filter(Boolean),
        billingAddress: mapAddress(o.billingAddress),
        shippingAddress: mapAddress(o.shippingAddress || o.billingAddress),
        items: (o.items || []).map((i) => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity,
            price: i.price,
            totalPrice: i.totalPrice
        }))
    };
}

async function listOrders() {
    const list = await snipcart(`/orders?limit=${PAGE_SIZE}&offset=0`);
    const summaries = list.items || [];
    // The list endpoint omits line items and some address fields, so fetch
    // each order in full. Fifty requests in parallel is well within limits.
    const full = await Promise.all(
        summaries.map((s) => snipcart('/orders/' + encodeURIComponent(s.token)).catch(() => s))
    );
    return {
        orders: full.map(mapOrder),
        totalItems: list.totalItems != null ? list.totalItems : full.length,
        fetchedAt: new Date().toISOString()
    };
}

exports.handler = async (event) => {
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
    const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

    if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });

    let payload;
    try {
        payload = event.body ? JSON.parse(event.body) : {};
    } catch (_) {
        return reply(400, { error: 'Invalid JSON body' });
    }

    try {
        if (!(await validSession(payload.token))) return reply(401, { error: 'Not signed in' });

        if (!process.env.SNIPCART_SECRET_KEY) {
            return reply(503, {
                error: 'SNIPCART_SECRET_KEY is not set in Netlify environment variables.'
            });
        }

        switch (payload.action) {
            case 'list':
                return reply(200, await listOrders());

            case 'update-status': {
                const { orderToken, status } = payload;
                if (!orderToken || !SETTABLE_STATUSES.includes(status)) {
                    return reply(400, { error: 'orderToken and a valid status are required' });
                }
                const body = { status };
                if (status === 'Shipped') {
                    body.trackingNumber = String(payload.trackingNumber || '').trim().slice(0, 100);
                    body.trackingUrl = String(payload.trackingUrl || '').trim().slice(0, 500);
                    if (body.trackingUrl && !/^https:\/\//i.test(body.trackingUrl)) {
                        return reply(400, { error: 'Tracking URL must start with https://' });
                    }
                }
                const path = '/orders/' + encodeURIComponent(orderToken);
                await snipcart(path, { method: 'PUT', body: JSON.stringify(body) });
                // Re-read so the dashboard gets the full order back, not
                // whatever subset the PUT response happens to include.
                return reply(200, { order: mapOrder(await snipcart(path)) });
            }

            default:
                return reply(400, { error: 'Unknown action' });
        }
    } catch (err) {
        // Log the status only — order bodies contain customer health purchases.
        console.error('snipcart-orders failed:', err.status || err.message);
        if (err.status === 401 || err.status === 403) {
            return reply(502, { error: 'Snipcart rejected the API key. Check SNIPCART_SECRET_KEY.' });
        }
        return reply(502, { error: 'Could not reach Snipcart. Try again in a moment.' });
    }
};
