/**
 * Mint Medical Clinic - Blog Webhook Handler
 *
 * Authenticated endpoint for blog article CRUD. GET is public; POST requires admin token.
 * Webhook URL: https://mintmedicalclinic.com/api/blog-webhook
 */

const { getStore } = require('@netlify/blobs');

// Get blob store with fallback for manual config
function getBlobStore(name) {
    try {
        return getStore(name);
    } catch (e) {
        if (process.env.NETLIFY_AUTH_TOKEN) {
            return getStore({
                name,
                siteID: process.env.SITE_ID || '38e7c65c-9693-4bec-9e83-e2312bd923db',
                token: process.env.NETLIFY_AUTH_TOKEN
            });
        }
        throw e;
    }
}

// Static webhook secret for external services (set in Netlify environment variables)
const WEBHOOK_SECRET = process.env.BLOG_WEBHOOK_SECRET || 'mint-medical-blog-2024';

// Validate token - accepts either static webhook secret OR admin session token
async function validateAdminToken(token) {
    if (!token || typeof token !== 'string') return false;

    // First check if it matches the static webhook secret
    if (token === WEBHOOK_SECRET) {
        return true;
    }

    // Fall back to session token validation for admin dashboard
    try {
        const sessions = getBlobStore('admin-sessions');
        const session = await sessions.get(token, { type: 'json' });
        if (!session || !session.expiresAt) return false;
        if (new Date(session.expiresAt) < new Date()) return false;
        return true;
    } catch (_) {
        return false;
    }
}

// Validate article structure
function validateArticle(article) {
    const required = ['slug', 'title', 'content'];
    const missing = required.filter(field => !article[field]);

    if (missing.length > 0) {
        return { valid: false, error: `Missing required fields: ${missing.join(', ')}` };
    }

    // Category validation is now dynamic - just check format if provided
    if (article.category && !/^[a-z0-9-]+$/.test(article.category)) {
        return { valid: false, error: 'Category must be lowercase alphanumeric with hyphens only' };
    }

    // Validate slug format and length
    if (!/^[a-z0-9-]+$/.test(article.slug)) {
        return { valid: false, error: 'Slug must be lowercase alphanumeric with hyphens only' };
    }
    if (article.slug.length > 128) {
        return { valid: false, error: 'Slug too long' };
    }
    if (article.title && article.title.length > 500) {
        return { valid: false, error: 'Title too long' };
    }
    if (article.excerpt && article.excerpt.length > 1000) {
        return { valid: false, error: 'Excerpt too long' };
    }

    return { valid: true };
}

// Sanitize HTML content: remove script, iframe, object, embed, form, event handlers
function sanitizeContent(content) {
    if (typeof content !== 'string') return '';
    let out = content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
        .replace(/<embed\b[^>]*>/gi, '')
        .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
        .replace(/\s on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\s on\w+\s*=\s*[^\s>]+/gi, '');
    return out;
}

// Allow only https or relative URLs for images (no javascript:, data:, etc.)
function sanitizeImageUrl(url) {
    if (!url || typeof url !== 'string') return '';
    const t = url.trim();
    if (!t) return '';
    if (t.startsWith('https://') || t.startsWith('/')) return t;
    return '';
}

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    let store;
    try {
        store = getBlobStore('articles');
    } catch (error) {
        console.error('Failed to initialize blob store:', error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Storage not configured' })
        };
    }

    // GET request - return articles
    if (event.httpMethod === 'GET') {
        try {
            const params = event.queryStringParameters || {};
            const slug = params.slug;
            const summary = params.summary === '1' || params.summary === 'true';

            // Single-article lookup by slug (fast path for article pages)
            if (slug) {
                if (!/^[a-z0-9-]+$/.test(slug) || slug.length > 128) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Invalid slug' })
                    };
                }
                const article = await store.get(slug, { type: 'json' });
                if (!article) {
                    return {
                        statusCode: 404,
                        headers: { ...headers, 'Cache-Control': 'public, max-age=60' },
                        body: JSON.stringify({ error: 'Article not found' })
                    };
                }
                return {
                    statusCode: 200,
                    headers: { ...headers, 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
                    body: JSON.stringify({ article })
                };
            }

            const { blobs } = await store.list();
            const articles = [];

            for (const blob of blobs) {
                const article = await store.get(blob.key, { type: 'json' });
                if (article) {
                    if (summary) {
                        articles.push({
                            slug: article.slug,
                            title: article.title,
                            excerpt: article.excerpt,
                            category: article.category,
                            author: article.author,
                            featuredImage: article.featuredImage,
                            tags: article.tags,
                            publishedAt: article.publishedAt,
                            updatedAt: article.updatedAt
                        });
                    } else {
                        articles.push(article);
                    }
                }
            }

            // Sort by publishedAt (newest first)
            articles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

            return {
                statusCode: 200,
                headers: { ...headers, 'Cache-Control': 'public, max-age=120, stale-while-revalidate=600' },
                body: JSON.stringify({ articles, lastUpdated: new Date().toISOString() })
            };
        } catch (error) {
            console.error('Error fetching articles:', error);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ articles: [], lastUpdated: new Date().toISOString() })
            };
        }
    }

    // Only allow POST for modifications (requires admin auth)
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    let payload;
    try {
        payload = event.body ? JSON.parse(event.body) : {};
    } catch (_) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid JSON body' })
        };
    }

    const { action, article, token } = payload;

    // Require valid admin token for any write
    const valid = await validateAdminToken(token);
    if (!valid) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Unauthorized' })
        };
    }

    try {
        // Validate action
        if (!['create', 'update', 'delete'].includes(action)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid action. Use: create, update, or delete' })
            };
        }

        // Validate article
        if (!article) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing article data' })
            };
        }

        // Handle delete action - only requires slug
        if (action === 'delete') {
            if (!article.slug) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Missing required field: slug' })
                };
            }
            await store.delete(article.slug);
            console.log(`Article deleted: ${article.slug}`);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'Article deleted successfully',
                    slug: article.slug
                })
            };
        }

        // Full validation for create/update actions
        const validation = validateArticle(article);
        if (!validation.valid) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: validation.error })
            };
        }

        // Sanitize content and set defaults for create/update
        const sanitizedArticle = {
            ...article,
            content: sanitizeContent(article.content),
            featuredImage: sanitizeImageUrl(article.featuredImage) || '',
            category: article.category || 'wellness',
            publishedAt: article.publishedAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Store the article in Netlify Blobs
        await store.setJSON(article.slug, sanitizedArticle);
        console.log(`Article ${action}d: ${article.slug}`);

        // Return success with the processed article
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: `Article ${action}d successfully`,
                article: {
                    slug: sanitizedArticle.slug,
                    title: sanitizedArticle.title,
                    category: sanitizedArticle.category,
                    publishedAt: sanitizedArticle.publishedAt
                }
            })
        };

    } catch (error) {
        console.error('Webhook error:', error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
