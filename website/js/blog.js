// Mint Medical Clinic - Blog JavaScript

(function() {
    'use strict';

    const ARTICLES_URL = '/api/blog-webhook';
    const AUTH_API = '/api/admin-auth';
    const ARTICLES_PER_PAGE = 9;
    let allArticles = [];
    let categories = {};

    function escapeHtml(str) {
        if (str == null) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    let filteredArticles = [];
    let currentPage = 1;
    let currentCategory = 'all';

    // Load categories from API
    async function loadCategories() {
        try {
            const response = await fetch(AUTH_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'list-categories' })
            });
            const data = await response.json();
            const categoryList = data.categories || [];

            // Convert to lookup object
            categories = {};
            categoryList.forEach(cat => {
                categories[cat.id] = cat.name;
            });
        } catch (error) {
            console.error('Error loading categories:', error);
            // Fallback to defaults
            categories = {
                'ed-treatment': 'ED Treatment',
                'hormone-therapy': 'Hormone Therapy',
                'weight-loss': 'Weight Loss',
                'womens-health': "Women's Health",
                'wellness': 'Wellness',
                'news': 'News'
            };
        }
    }

    // ===== Initialize Blog =====
    document.addEventListener('DOMContentLoaded', function() {
        const blogGrid = document.getElementById('blogGrid');
        const articleBody = document.getElementById('articleBody');

        if (blogGrid) {
            // We're on the blog listing page
            initBlogListing();
        } else if (articleBody) {
            // We're on an article page
            initArticlePage();
        }
    });

    // ===== Blog Listing Page =====
    async function initBlogListing() {
        try {
            // Load categories first, then articles
            await loadCategories();

            const response = await fetch(ARTICLES_URL);
            const data = await response.json();
            allArticles = data.articles || [];

            // Sort by date (newest first)
            allArticles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

            filteredArticles = [...allArticles];

            initCategoryFilters();
            renderArticles();
        } catch (error) {
            console.error('Error loading articles:', error);
            showEmptyState();
        }
    }

    function initCategoryFilters() {
        const categoryBtns = document.querySelectorAll('.category-btn');

        categoryBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                // Update active state
                categoryBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                // Filter articles
                currentCategory = this.dataset.category;
                currentPage = 1;

                if (currentCategory === 'all') {
                    filteredArticles = [...allArticles];
                } else {
                    filteredArticles = allArticles.filter(article =>
                        article.category === currentCategory ||
                        (article.tags && article.tags.includes(currentCategory))
                    );
                }

                renderArticles();
            });
        });
    }

    function renderArticles() {
        const blogGrid = document.getElementById('blogGrid');
        const blogEmpty = document.getElementById('blogEmpty');
        const loadMoreContainer = document.getElementById('loadMoreContainer');

        if (!filteredArticles.length) {
            showEmptyState();
            return;
        }

        blogEmpty.style.display = 'none';

        const startIndex = 0;
        const endIndex = currentPage * ARTICLES_PER_PAGE;
        const articlesToShow = filteredArticles.slice(startIndex, endIndex);

        blogGrid.innerHTML = articlesToShow.map(article => createArticleCard(article)).join('');
        updateBlogListingSchema(articlesToShow);

        // Show/hide load more button
        if (endIndex < filteredArticles.length) {
            loadMoreContainer.style.display = 'block';
            const loadMoreBtn = document.getElementById('loadMoreBtn');
            loadMoreBtn.onclick = function() {
                currentPage++;
                renderArticles();
            };
        } else {
            loadMoreContainer.style.display = 'none';
        }
    }

    function updateBlogListingSchema(articles) {
        const blogSchemaId = 'blog-list-schema';
        let schemaScript = document.getElementById(blogSchemaId);
        if (!schemaScript) {
            schemaScript = document.createElement('script');
            schemaScript.type = 'application/ld+json';
            schemaScript.id = blogSchemaId;
            document.head.appendChild(schemaScript);
        }

        const itemListElement = articles.map((article, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `https://mintmedicalclinic.com/blog/${encodeURIComponent(article.slug)}`,
            name: article.title
        }));

        const graph = [
            {
                '@type': 'CollectionPage',
                '@id': 'https://mintmedicalclinic.com/blog.html#webpage',
                url: 'https://mintmedicalclinic.com/blog.html',
                name: 'Mint Medical Clinic Blog',
                description: 'Health and wellness blog articles from Mint Medical Clinic.',
                isPartOf: { '@id': 'https://mintmedicalclinic.com/#website' }
            },
            {
                '@type': 'ItemList',
                '@id': 'https://mintmedicalclinic.com/blog.html#itemlist',
                itemListOrder: 'https://schema.org/ItemListOrderDescending',
                numberOfItems: itemListElement.length,
                itemListElement
            }
        ];

        schemaScript.textContent = JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': graph
        });
    }

    function createArticleCard(article) {
        const date = new Date(article.publishedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const categoryLabel = getCategoryLabel(article.category);
        const imageUrl = article.featuredImage || '/images/Patient-Consult-scaled-1.jpg';

        const safeSlug = encodeURIComponent(article.slug);
        const safeImageUrl = (imageUrl && (imageUrl.startsWith('https://') || imageUrl.startsWith('/'))) ? imageUrl : '/images/Patient-Consult-scaled-1.jpg';
        return `
            <article class="blog-card">
                <a href="/blog/article.html?slug=${safeSlug}" class="blog-card-image">
                    <img src="${escapeHtml(safeImageUrl)}" alt="${escapeHtml(article.title)} - Mint Medical Clinic Blog" loading="lazy">
                    <span class="blog-card-category">${escapeHtml(categoryLabel)}</span>
                </a>
                <div class="blog-card-content">
                    <span class="blog-card-date">${escapeHtml(date)}</span>
                    <h3><a href="/blog/article.html?slug=${safeSlug}">${escapeHtml(article.title)}</a></h3>
                    <p>${escapeHtml(article.excerpt || '')}</p>
                    <a href="/blog/article.html?slug=${safeSlug}" class="blog-card-link">Read More <span>→</span></a>
                </div>
            </article>
        `;
    }

    function showEmptyState() {
        const blogGrid = document.getElementById('blogGrid');
        const blogEmpty = document.getElementById('blogEmpty');
        const loadMoreContainer = document.getElementById('loadMoreContainer');

        blogGrid.innerHTML = '';
        blogEmpty.style.display = 'block';
        loadMoreContainer.style.display = 'none';
    }

    // ===== Article Page =====
    async function initArticlePage() {
        const urlParams = new URLSearchParams(window.location.search);
        const slug = urlParams.get('slug');

        if (!slug) {
            showArticleError('Article not found');
            return;
        }

        try {
            // Load categories first, then articles
            await loadCategories();

            const response = await fetch(ARTICLES_URL);
            const data = await response.json();
            allArticles = data.articles || [];

            const article = allArticles.find(a => a.slug === slug);

            if (!article) {
                showArticleError('Article not found');
                return;
            }

            renderArticle(article);
            renderRelatedArticles(article);
            updateMetaTags(article);
            updateShareButtons(article);
            updateSchema(article);
        } catch (error) {
            console.error('Error loading article:', error);
            showArticleError('Error loading article');
        }
    }

    function renderArticle(article) {
        const date = new Date(article.publishedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Update breadcrumb
        document.getElementById('breadcrumbTitle').textContent = article.title;

        // Update header
        document.getElementById('articleCategory').textContent = getCategoryLabel(article.category);
        document.getElementById('articleDate').textContent = date;
        document.getElementById('articleTitle').textContent = article.title;
        document.getElementById('articleExcerpt').textContent = article.excerpt || '';

        // Update author (escape to prevent XSS)
        const authorEl = document.getElementById('articleAuthor');
        if (article.author) {
            authorEl.textContent = 'By ' + article.author;
        } else {
            authorEl.textContent = 'By Mint Medical Team';
        }

        // Update featured image (only allow https or relative URLs)
        const imageContainer = document.getElementById('articleImage');
        const imgUrl = article.featuredImage && (article.featuredImage.startsWith('https://') || article.featuredImage.startsWith('/'))
            ? article.featuredImage : '';
        if (imgUrl) {
            const img = document.createElement('img');
            img.src = imgUrl;
            img.alt = article.title + ' - Mint Medical Clinic';
            img.title = article.title;
            imageContainer.innerHTML = '';
            imageContainer.appendChild(img);
        } else {
            imageContainer.style.display = 'none';
        }

        // Update body content with CTA boxes
        document.getElementById('articleBody').innerHTML = insertArticleCTAs(article.content);

        // Update tags (escape tag text)
        const tagsContainer = document.getElementById('articleTags');
        if (article.tags && article.tags.length) {
            tagsContainer.innerHTML = article.tags.map(tag =>
                `<a href="/blog.html?category=${encodeURIComponent(tag)}" class="article-tag">${escapeHtml(tag)}</a>`
            ).join('');
        }
    }

    function renderRelatedArticles(currentArticle) {
        const relatedContainer = document.getElementById('relatedArticles');

        // Find related articles (same category, excluding current)
        const related = allArticles
            .filter(a => a.slug !== currentArticle.slug)
            .filter(a => a.category === currentArticle.category ||
                (a.tags && currentArticle.tags && a.tags.some(t => currentArticle.tags.includes(t))))
            .slice(0, 3);

        if (related.length) {
            relatedContainer.innerHTML = related.map(article => createArticleCard(article)).join('');
        } else {
            // Show latest articles instead
            const latest = allArticles
                .filter(a => a.slug !== currentArticle.slug)
                .slice(0, 3);

            if (latest.length) {
                relatedContainer.innerHTML = latest.map(article => createArticleCard(article)).join('');
            } else {
                relatedContainer.parentElement.style.display = 'none';
            }
        }
    }

    function updateMetaTags(article) {
        document.title = `${article.title} | Mint Medical Clinic Blog`;

        const metaTags = {
            'description': article.excerpt,
            'title': article.title,
            'og:title': article.title,
            'og:description': article.excerpt,
            'og:url': window.location.href,
            'og:image': article.featuredImage || 'https://mintmedicalclinic.com/images/og-image.jpg',
            'twitter:title': article.title,
            'twitter:description': article.excerpt,
            'twitter:image': article.featuredImage || 'https://mintmedicalclinic.com/images/og-image.jpg'
        };

        Object.entries(metaTags).forEach(([name, content]) => {
            let meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
            if (meta) {
                meta.setAttribute('content', content);
            }
        });

        // Update canonical
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) {
            canonical.setAttribute('href', window.location.href);
        }
    }

    function updateShareButtons(article) {
        const url = encodeURIComponent(window.location.href);
        const title = encodeURIComponent(article.title);

        document.getElementById('shareFacebook').href =
            `https://www.facebook.com/sharer/sharer.php?u=${url}`;

        document.getElementById('shareTwitter').href =
            `https://twitter.com/intent/tweet?url=${url}&text=${title}`;

        document.getElementById('shareLinkedIn').href =
            `https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${title}`;

        document.getElementById('shareEmail').href =
            `mailto:?subject=${title}&body=Check out this article: ${url}`;
    }

    function updateSchema(article) {
        const articleUrl = window.location.href;
        const imageUrl = article.featuredImage || 'https://mintmedicalclinic.com/images/og-image.jpg';
        const articleBody = document.getElementById('articleBody');
        const faqCandidates = Array.from(articleBody.querySelectorAll('h2, h3'))
            .filter((el) => el.textContent.trim().endsWith('?'))
            .slice(0, 8);

        const faqEntities = faqCandidates.map((questionEl) => {
            let answerEl = questionEl.nextElementSibling;
            while (answerEl && answerEl.tagName !== 'P') {
                answerEl = answerEl.nextElementSibling;
            }
            if (!answerEl) return null;
            const q = questionEl.textContent.trim();
            const a = answerEl.textContent.trim();
            if (!q || !a) return null;
            return {
                '@type': 'Question',
                name: q,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: a
                }
            };
        }).filter(Boolean);

        const graph = [
            {
                '@type': 'BlogPosting',
                '@id': `${articleUrl}#article`,
                headline: article.title,
                description: article.excerpt,
                image: [imageUrl],
                datePublished: article.publishedAt,
                dateModified: article.updatedAt || article.publishedAt,
                author: {
                    '@type': 'Person',
                    name: article.author || 'Mint Medical Team'
                },
                publisher: {
                    '@type': 'MedicalBusiness',
                    '@id': 'https://mintmedicalclinic.com/#organization',
                    name: 'Mint Medical Clinic',
                    logo: {
                        '@type': 'ImageObject',
                        url: 'https://mintmedicalclinic.com/images/mint-medical-logo.png'
                    }
                },
                mainEntityOfPage: {
                    '@type': 'WebPage',
                    '@id': `${articleUrl}#webpage`
                }
            },
            {
                '@type': 'WebPage',
                '@id': `${articleUrl}#webpage`,
                url: articleUrl,
                name: article.title,
                description: article.excerpt,
                isPartOf: { '@id': 'https://mintmedicalclinic.com/#website' },
                about: { '@id': 'https://mintmedicalclinic.com/#organization' }
            }
        ];

        if (faqEntities.length) {
            graph.push({
                '@type': 'FAQPage',
                '@id': `${articleUrl}#faq`,
                mainEntity: faqEntities
            });
        }

        document.getElementById('article-schema').textContent = JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': graph
        });
    }

    function showArticleError(message) {
        document.getElementById('articleTitle').textContent = message;
        document.getElementById('articleBody').innerHTML = '<p>' + escapeHtml(message) + '. <a href="/blog.html">Return to blog</a>.</p>';
    }

    // ===== Utility Functions =====

    // CTA box HTML template
    function getCtaBoxHtml() {
        return `
            <div class="article-cta-box">
                <h3>Ready to Take the Next Step?</h3>
                <p>Schedule your FREE consultation today and discover how we can help you achieve your health goals.</p>
                <a href="https://new-consultation.zohobookings.com/#/mintmedicalclinic" target="_blank" rel="noopener" class="btn">Schedule Free Consultation</a>
            </div>
        `;
    }

    // Insert CTA boxes into article content
    function insertArticleCTAs(content) {
        // Create a temporary container to parse the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;

        // Get all block-level elements (paragraphs, headings, lists, etc.)
        const blockElements = tempDiv.querySelectorAll('p, h2, h3, h4, ul, ol, blockquote');
        const totalBlocks = blockElements.length;

        // Only insert CTAs if there's enough content
        if (totalBlocks < 4) {
            // If short article, just add CTA at the end
            return content + getCtaBoxHtml();
        }

        // Calculate position for first CTA (approximately 1/3 through)
        const firstCtaPosition = Math.floor(totalBlocks / 3);

        // Insert first CTA after the calculated position
        if (blockElements[firstCtaPosition]) {
            blockElements[firstCtaPosition].insertAdjacentHTML('afterend', getCtaBoxHtml());
        }

        // Add CTA at the end
        tempDiv.innerHTML += getCtaBoxHtml();

        return tempDiv.innerHTML;
    }

    function getCategoryLabel(category) {
        // Use dynamically loaded categories, with fallback
        if (categories[category]) {
            return categories[category];
        }
        // Fallback for any unrecognized categories
        return category ? category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Wellness';
    }

})();
