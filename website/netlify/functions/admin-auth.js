/**
 * Mint Medical Clinic - Admin Authentication Handler
 *
 * Handles login, logout, session validation, and user management
 */

const { getStore } = require('@netlify/blobs');
const crypto = require('crypto');

// Hash password with salt
function hashPassword(password, salt = null) {
    salt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return { hash, salt };
}

// Verify password
function verifyPassword(password, hash, salt) {
    const verify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verify;
}

// Generate session token
function generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Get blob store with fallback for manual config
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

// Get blob stores
function getStores() {
    const users = getBlobStore('admin-users');
    const sessions = getBlobStore('admin-sessions');
    const categories = getBlobStore('blog-categories');
    return { users, sessions, categories };
}

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
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

        const { users, sessions, categories } = getStores();
        const { action } = payload;

        switch (action) {
            case 'login': {
                const { username, password } = payload;

                if (!username || !password) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Username and password required' })
                    };
                }

                const user = await users.get(username.toLowerCase(), { type: 'json' });

                if (!user || !verifyPassword(password, user.passwordHash, user.salt)) {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({ error: 'Invalid credentials' })
                    };
                }

                // Create session
                const sessionToken = generateSessionToken();
                const session = {
                    username: user.username,
                    createdAt: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
                };

                await sessions.setJSON(sessionToken, session);

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        token: sessionToken,
                        user: { username: user.username, name: user.name }
                    })
                };
            }

            case 'logout': {
                const { token } = payload;
                if (token) {
                    await sessions.delete(token);
                }
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true })
                };
            }

            case 'validate': {
                const { token } = payload;

                if (!token) {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({ error: 'No token provided' })
                    };
                }

                const session = await sessions.get(token, { type: 'json' });

                if (!session) {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({ error: 'Invalid session' })
                    };
                }

                if (new Date(session.expiresAt) < new Date()) {
                    await sessions.delete(token);
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({ error: 'Session expired' })
                    };
                }

                const user = await users.get(session.username, { type: 'json' });

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        valid: true,
                        user: { username: user.username, name: user.name }
                    })
                };
            }

            case 'create-user': {
                const { token, username, password, name } = payload;

                // Validate admin session
                if (token) {
                    const session = await sessions.get(token, { type: 'json' });
                    if (!session || new Date(session.expiresAt) < new Date()) {
                        // Check if any users exist - if not, allow first user creation
                        const { blobs } = await users.list();
                        if (blobs.length > 0) {
                            return {
                                statusCode: 401,
                                headers,
                                body: JSON.stringify({ error: 'Unauthorized' })
                            };
                        }
                    }
                } else {
                    // Check if any users exist
                    const { blobs } = await users.list();
                    if (blobs.length > 0) {
                        return {
                            statusCode: 401,
                            headers,
                            body: JSON.stringify({ error: 'Unauthorized - login required' })
                        };
                    }
                }

                if (!username || !password) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Username and password required' })
                    };
                }

                if (username.length > 128) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Username too long' })
                    };
                }

                if (password.length < 8) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Password must be at least 8 characters' })
                    };
                }

                // Check if user exists
                const existingUser = await users.get(username.toLowerCase(), { type: 'json' });
                if (existingUser) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Username already exists' })
                    };
                }

                // Create user
                const { hash, salt } = hashPassword(password);
                const newUser = {
                    username: username.toLowerCase(),
                    name: name || username,
                    passwordHash: hash,
                    salt: salt,
                    createdAt: new Date().toISOString()
                };

                await users.setJSON(username.toLowerCase(), newUser);

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        user: { username: newUser.username, name: newUser.name }
                    })
                };
            }

            case 'change-password': {
                const { token, currentPassword, newPassword } = payload;

                if (!token) {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({ error: 'Not authenticated' })
                    };
                }

                const session = await sessions.get(token, { type: 'json' });
                if (!session || new Date(session.expiresAt) < new Date()) {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({ error: 'Session invalid or expired' })
                    };
                }

                const user = await users.get(session.username, { type: 'json' });

                if (!verifyPassword(currentPassword, user.passwordHash, user.salt)) {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({ error: 'Current password incorrect' })
                    };
                }

                if (!newPassword || newPassword.length < 8) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'New password must be at least 8 characters' })
                    };
                }

                const { hash, salt } = hashPassword(newPassword);
                user.passwordHash = hash;
                user.salt = salt;
                user.updatedAt = new Date().toISOString();

                await users.setJSON(session.username, user);

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true })
                };
            }

            case 'check-setup': {
                // Check if any users exist (do not expose user count)
                const { blobs } = await users.list();
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ needsSetup: blobs.length === 0 })
                };
            }

            case 'list-categories': {
                // Get all categories (no auth required for reading)
                const { blobs } = await categories.list();
                const categoryList = [];

                for (const blob of blobs) {
                    const category = await categories.get(blob.key, { type: 'json' });
                    if (category) {
                        categoryList.push(category);
                    }
                }

                // Sort by name
                categoryList.sort((a, b) => a.name.localeCompare(b.name));

                // If no categories exist, return defaults
                if (categoryList.length === 0) {
                    const defaults = [
                        { id: 'ed-treatment', name: 'ED Treatment' },
                        { id: 'hormone-therapy', name: 'Hormone Therapy' },
                        { id: 'weight-loss', name: 'Weight Loss' },
                        { id: 'womens-health', name: "Women's Health" },
                        { id: 'wellness', name: 'Wellness' },
                        { id: 'news', name: 'News' }
                    ];
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({ categories: defaults, isDefault: true })
                    };
                }

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ categories: categoryList })
                };
            }

            case 'create-category': {
                const { token, id, name } = payload;

                if (!token) {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({ error: 'Not authenticated' })
                    };
                }

                const session = await sessions.get(token, { type: 'json' });
                if (!session || new Date(session.expiresAt) < new Date()) {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({ error: 'Session invalid or expired' })
                    };
                }

                if (!id || !name) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Category ID and name are required' })
                    };
                }

                if (id.length > 64 || !/^[a-z0-9-]+$/.test(id)) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Category ID must be lowercase alphanumeric with hyphens, max 64 characters' })
                    };
                }

                // Check if category exists
                const existing = await categories.get(id, { type: 'json' });
                if (existing) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Category ID already exists' })
                    };
                }

                const newCategory = {
                    id,
                    name,
                    createdAt: new Date().toISOString()
                };

                await categories.setJSON(id, newCategory);

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, category: newCategory })
                };
            }

            case 'update-category': {
                const { token, id, name } = payload;

                if (!token) {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({ error: 'Not authenticated' })
                    };
                }

                const session = await sessions.get(token, { type: 'json' });
                if (!session || new Date(session.expiresAt) < new Date()) {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({ error: 'Session invalid or expired' })
                    };
                }

                if (!id || !name) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Category ID and name are required' })
                    };
                }

                if (id.length > 64 || !/^[a-z0-9-]+$/.test(id)) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Category ID must be lowercase alphanumeric with hyphens, max 64 characters' })
                    };
                }

                const category = await categories.get(id, { type: 'json' });
                if (!category) {
                    // Create if doesn't exist (for migrating defaults)
                    const newCategory = {
                        id,
                        name,
                        createdAt: new Date().toISOString()
                    };
                    await categories.setJSON(id, newCategory);
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({ success: true, category: newCategory })
                    };
                }

                category.name = name;
                category.updatedAt = new Date().toISOString();

                await categories.setJSON(id, category);

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, category })
                };
            }

            case 'delete-category': {
                const { token, id } = payload;

                if (!token) {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({ error: 'Not authenticated' })
                    };
                }

                const session = await sessions.get(token, { type: 'json' });
                if (!session || new Date(session.expiresAt) < new Date()) {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({ error: 'Session invalid or expired' })
                    };
                }

                if (!id) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Category ID is required' })
                    };
                }

                await categories.delete(id);

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true })
                };
            }

            case 'list-users': {
                const { token } = payload;

                if (!token) {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({ error: 'Not authenticated' })
                    };
                }

                const session = await sessions.get(token, { type: 'json' });
                if (!session || new Date(session.expiresAt) < new Date()) {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({ error: 'Session invalid or expired' })
                    };
                }

                // Get all users
                const { blobs } = await users.list();
                const userList = [];

                for (const blob of blobs) {
                    const user = await users.get(blob.key, { type: 'json' });
                    if (user) {
                        userList.push({
                            username: user.username,
                            name: user.name,
                            createdAt: user.createdAt
                        });
                    }
                }

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ users: userList })
                };
            }

            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid action' })
                };
        }

    } catch (error) {
        console.error('Auth error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
