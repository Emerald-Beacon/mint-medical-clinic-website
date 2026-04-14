// Mint Medical Clinic - Main JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // ===== Sitewide SEO/GEO Schema and Metadata =====
    (function applySitewideSeoAndGeo() {
        const SITE_URL = 'https://mintmedicalclinic.com';
        const PAGE_URL = window.location.href.split('#')[0];
        const PATHNAME = window.location.pathname || '/';
        const TITLE = (document.querySelector('title')?.textContent || 'Mint Medical Clinic').trim();
        const DESCRIPTION = (
            document.querySelector('meta[name="description"]')?.getAttribute('content')
            || 'Mint Medical Clinic provides intimacy health, hormone therapy, and medical wellness services in Utah.'
        ).trim();

        const toAbsoluteUrl = (url) => {
            if (!url) return '';
            try {
                return new URL(url, SITE_URL).href;
            } catch (error) {
                return '';
            }
        };

        const ensureMeta = (selector, attrs) => {
            let el = document.querySelector(selector);
            if (!el) {
                el = document.createElement('meta');
                Object.entries(attrs).forEach(([key, value]) => {
                    if (key !== 'content') {
                        el.setAttribute(key, value);
                    }
                });
                document.head.appendChild(el);
            }
            if (attrs.content) {
                el.setAttribute('content', attrs.content);
            }
        };

        const ensureCanonical = () => {
            let canonical = document.querySelector('link[rel="canonical"]');
            if (!canonical) {
                canonical = document.createElement('link');
                canonical.setAttribute('rel', 'canonical');
                document.head.appendChild(canonical);
            }
            canonical.setAttribute('href', PAGE_URL);
        };

        ensureCanonical();
        ensureMeta('meta[name="robots"]', { name: 'robots', content: 'index, follow, max-image-preview:large' });
        ensureMeta('meta[property="og:locale"]', { property: 'og:locale', content: 'en_US' });
        ensureMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: 'Mint Medical Clinic' });
        ensureMeta('meta[property="og:type"]', { property: 'og:type', content: PATHNAME.startsWith('/blog/') ? 'article' : 'website' });
        ensureMeta('meta[property="og:url"]', { property: 'og:url', content: PAGE_URL });
        ensureMeta('meta[property="og:title"]', { property: 'og:title', content: TITLE });
        ensureMeta('meta[property="og:description"]', { property: 'og:description', content: DESCRIPTION });
        ensureMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
        ensureMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: TITLE });
        ensureMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: DESCRIPTION });
        ensureMeta('meta[name="geo.region"]', { name: 'geo.region', content: 'US-UT' });
        ensureMeta('meta[name="geo.placename"]', { name: 'geo.placename', content: 'Sandy and Layton, Utah' });

        const getImageObjects = () => {
            const images = Array.from(document.querySelectorAll('img[src]'))
                .map((img, index) => {
                    const src = toAbsoluteUrl(img.getAttribute('src'));
                    if (!src) return null;
                    const caption = (img.getAttribute('alt') || img.getAttribute('title') || '').trim();
                    return {
                        '@type': 'ImageObject',
                        '@id': `${PAGE_URL}#image-${index + 1}`,
                        contentUrl: src,
                        url: src,
                        caption: caption || undefined,
                        representativeOfPage: index === 0
                    };
                })
                .filter(Boolean);
            return images;
        };

        const getVideoObjects = () => {
            const videos = [];
            const iframeSelectors = 'iframe[src*="youtube.com"], iframe[src*="youtu.be"], iframe[src*="vimeo.com"]';
            const iframes = Array.from(document.querySelectorAll(iframeSelectors));
            iframes.forEach((iframe, index) => {
                const src = toAbsoluteUrl(iframe.getAttribute('src'));
                if (!src) return;
                const name = (iframe.getAttribute('title') || `Mint Medical Clinic Video ${index + 1}`).trim();
                videos.push({
                    '@type': 'VideoObject',
                    '@id': `${PAGE_URL}#video-${index + 1}`,
                    name,
                    description: DESCRIPTION,
                    embedUrl: src,
                    contentUrl: src,
                    isPartOf: { '@id': `${PAGE_URL}#webpage` }
                });
            });
            return videos;
        };

        const getFaqSchema = () => {
            const faqItems = Array.from(document.querySelectorAll('.faq-item')).map((item) => {
                const question = item.querySelector('h2, h3, h4, strong');
                const answer = item.querySelector('p, div');
                const qText = (question?.textContent || '').trim();
                const aText = (answer?.textContent || '').trim();
                if (!qText || !aText) return null;
                return {
                    '@type': 'Question',
                    name: qText,
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: aText
                    }
                };
            }).filter(Boolean);

            if (!faqItems.length) {
                return null;
            }

            return {
                '@type': 'FAQPage',
                '@id': `${PAGE_URL}#faq`,
                mainEntity: faqItems
            };
        };

        const websiteSchema = {
            '@type': 'WebSite',
            '@id': `${SITE_URL}/#website`,
            url: SITE_URL,
            name: 'Mint Medical Clinic',
            inLanguage: 'en-US'
        };

        const organizationSchema = {
            '@type': 'MedicalBusiness',
            '@id': `${SITE_URL}/#organization`,
            name: 'Mint Medical Clinic',
            url: SITE_URL,
            telephone: '+1-801-804-8000',
            email: 'info@mintmedicalclinic.com',
            priceRange: '$$',
            areaServed: {
                '@type': 'State',
                name: 'Utah'
            },
            makesOffer: [
                { '@type': 'Offer', itemOffered: { '@type': 'MedicalProcedure', name: 'ED Treatment' } },
                { '@type': 'Offer', itemOffered: { '@type': 'MedicalProcedure', name: 'Hormone Replacement Therapy' } },
                { '@type': 'Offer', itemOffered: { '@type': 'MedicalProcedure', name: 'Medical Weight Loss' } }
            ]
        };

        const sandyLocationSchema = {
            '@type': 'MedicalClinic',
            '@id': `${SITE_URL}/#sandy-location`,
            name: 'Mint Medical Clinic - Sandy',
            url: `${SITE_URL}/`,
            telephone: '+1-801-804-8000',
            parentOrganization: { '@id': `${SITE_URL}/#organization` },
            address: {
                '@type': 'PostalAddress',
                streetAddress: '10011 S. Centennial Pkwy, Suite 350',
                addressLocality: 'Sandy',
                addressRegion: 'UT',
                postalCode: '84070',
                addressCountry: 'US'
            },
            geo: {
                '@type': 'GeoCoordinates',
                latitude: 40.5649,
                longitude: -111.8389
            },
            openingHoursSpecification: [
                {
                    '@type': 'OpeningHoursSpecification',
                    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                    opens: '09:00',
                    closes: '17:00'
                },
                {
                    '@type': 'OpeningHoursSpecification',
                    dayOfWeek: 'Saturday',
                    opens: '09:00',
                    closes: '17:00'
                }
            ]
        };

        const laytonLocationSchema = {
            '@type': 'MedicalClinic',
            '@id': `${SITE_URL}/#layton-location`,
            name: 'Mint Medical Clinic - Layton',
            url: `${SITE_URL}/`,
            telephone: '+1-801-804-8000',
            parentOrganization: { '@id': `${SITE_URL}/#organization` },
            address: {
                '@type': 'PostalAddress',
                streetAddress: '836 S Main St',
                addressLocality: 'Layton',
                addressRegion: 'UT',
                postalCode: '84041',
                addressCountry: 'US'
            },
            geo: {
                '@type': 'GeoCoordinates',
                latitude: 41.0602,
                longitude: -111.9711
            },
            openingHoursSpecification: [
                {
                    '@type': 'OpeningHoursSpecification',
                    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                    opens: '09:00',
                    closes: '17:00'
                },
                {
                    '@type': 'OpeningHoursSpecification',
                    dayOfWeek: 'Saturday',
                    opens: '09:00',
                    closes: '17:00'
                }
            ]
        };

        const webpageSchema = {
            '@type': 'WebPage',
            '@id': `${PAGE_URL}#webpage`,
            url: PAGE_URL,
            name: TITLE,
            description: DESCRIPTION,
            isPartOf: { '@id': `${SITE_URL}/#website` },
            about: { '@id': `${SITE_URL}/#organization` },
            primaryImageOfPage: getImageObjects()[0] ? { '@id': `${PAGE_URL}#image-1` } : undefined,
            inLanguage: 'en-US'
        };

        const graph = [
            websiteSchema,
            organizationSchema,
            sandyLocationSchema,
            laytonLocationSchema,
            webpageSchema,
            ...getImageObjects(),
            ...getVideoObjects()
        ];

        const faqSchema = getFaqSchema();
        if (faqSchema) {
            graph.push(faqSchema);
        }

        const schemaScriptId = 'sitewide-schema';
        let schemaScript = document.getElementById(schemaScriptId);
        if (!schemaScript) {
            schemaScript = document.createElement('script');
            schemaScript.type = 'application/ld+json';
            schemaScript.id = schemaScriptId;
            document.head.appendChild(schemaScript);
        }
        schemaScript.textContent = JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': graph
        });
    })();


    // ===== Secret Admin Access (7 clicks on logo) =====
    const logo = document.querySelector('.logo');
    let logoClickCount = 0;
    let logoClickTimer = null;

    if (logo) {
        logo.addEventListener('click', function(e) {
            logoClickCount++;

            // Reset counter after 3 seconds of no clicks
            clearTimeout(logoClickTimer);
            logoClickTimer = setTimeout(() => {
                logoClickCount = 0;
            }, 3000);

            // Navigate to admin after 7 clicks
            if (logoClickCount >= 7) {
                e.preventDefault();
                logoClickCount = 0;
                window.location.href = '/admin/';
            }
        });
    }

    // ===== Mobile Menu Toggle =====
    // NOTE: Mobile menu is initialized in header.js after header injection
    // This section is intentionally empty to avoid duplicate event handlers

    // ===== Header Scroll Effect =====
    const header = document.querySelector('.header');
    let lastScroll = 0;

    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset;

        // Add shadow on scroll
        if (currentScroll > 10) {
            header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.08)';
        } else {
            header.style.boxShadow = 'none';
        }

        lastScroll = currentScroll;
    });

    // ===== Smooth Scroll for Anchor Links =====
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));

            if (target) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });

                // Close mobile menu if open
                const navLinks = document.querySelector('.nav-links');
                const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
                if (navLinks && navLinks.classList.contains('mobile-open')) {
                    mobileMenuBtn.classList.remove('active');
                    navLinks.classList.remove('mobile-open');
                    document.body.classList.remove('menu-open');
                }
            }
        });
    });

    // ===== Intersection Observer for Animations =====
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe elements for animation
    document.querySelectorAll('.service-card, .process-step, .testimonial-card, .about-features li').forEach(el => {
        el.classList.add('animate-target');
        observer.observe(el);
    });

    // ===== Form Validation (if contact form exists) =====
    const contactForm = document.querySelector('.contact-form');

    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Basic validation
            let isValid = true;
            const requiredFields = this.querySelectorAll('[required]');

            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.classList.add('error');
                } else {
                    field.classList.remove('error');
                }
            });

            // Email validation
            const emailField = this.querySelector('input[type="email"]');
            if (emailField && emailField.value) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(emailField.value)) {
                    isValid = false;
                    emailField.classList.add('error');
                }
            }

            if (isValid) {
                // Handle form submission
                console.log('Form submitted successfully');
                // You can add AJAX submission here
            }
        });
    }

    // ===== Testimonial Slider (Optional) =====
    const testimonialSlider = document.querySelector('.testimonials-slider');

    if (testimonialSlider) {
        let currentSlide = 0;
        const slides = testimonialSlider.querySelectorAll('.testimonial-card');
        const totalSlides = slides.length;

        function showSlide(index) {
            slides.forEach((slide, i) => {
                slide.style.display = i === index ? 'block' : 'none';
            });
        }

        function nextSlide() {
            currentSlide = (currentSlide + 1) % totalSlides;
            showSlide(currentSlide);
        }

        // Auto-advance slides every 5 seconds
        if (totalSlides > 1) {
            setInterval(nextSlide, 5000);
        }
    }

    // ===== Counter Animation =====
    function animateCounter(element, target, duration = 2000) {
        const suffix = element.dataset.suffix || '';
        const isDecimal = element.dataset.decimal === 'true';
        let start = 0;
        const increment = target / (duration / 16);

        function updateCounter() {
            start += increment;
            if (start < target) {
                if (isDecimal) {
                    element.textContent = start.toFixed(1) + suffix;
                } else {
                    element.textContent = Math.floor(start) + suffix;
                }
                requestAnimationFrame(updateCounter);
            } else {
                if (isDecimal) {
                    element.textContent = target.toFixed(1) + suffix;
                } else {
                    element.textContent = target + suffix;
                }
            }
        }

        updateCounter();
    }

    // Observe stat counters
    const statNumbers = document.querySelectorAll('.stat-number[data-target]');

    if (statNumbers.length) {
        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = parseFloat(entry.target.dataset.target);
                    if (!isNaN(target)) {
                        animateCounter(entry.target, target);
                    }
                    counterObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        statNumbers.forEach(stat => counterObserver.observe(stat));
    }

    // ===== Lazy Loading Images =====
    if ('IntersectionObserver' in window) {
        const lazyImages = document.querySelectorAll('img[data-src]');

        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });

        lazyImages.forEach(img => imageObserver.observe(img));
    }

    // ===== KSL Offer Popup Toggle =====
    const kslPopup = document.getElementById('kslOfferPopup');
    const kslMinimizeBtn = document.getElementById('kslMinimizeBtn');
    const kslMinimizedTab = document.getElementById('kslMinimizedTab');

    if (kslPopup && kslMinimizeBtn && kslMinimizedTab) {
        // Minimize popup
        kslMinimizeBtn.addEventListener('click', function() {
            kslPopup.classList.add('minimized');
            kslMinimizedTab.classList.add('visible');
        });

        // Expand popup from minimized tab
        kslMinimizedTab.addEventListener('click', function() {
            kslPopup.classList.remove('minimized');
            kslMinimizedTab.classList.remove('visible');
        });

        // Check if user has previously minimized (persist across page loads)
        if (sessionStorage.getItem('kslOfferMinimized') === 'true') {
            kslPopup.classList.add('minimized');
            kslMinimizedTab.classList.add('visible');
        }

        // Save state when minimizing
        kslMinimizeBtn.addEventListener('click', function() {
            sessionStorage.setItem('kslOfferMinimized', 'true');
        });

        // Clear state when expanding
        kslMinimizedTab.addEventListener('click', function() {
            sessionStorage.removeItem('kslOfferMinimized');
        });
    }

});

// ===== Add CSS for animations =====
const style = document.createElement('style');
style.textContent = `
    .animate-target {
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.6s ease, transform 0.6s ease;
    }

    .animate-target.animate-in {
        opacity: 1;
        transform: translateY(0);
    }

    body.menu-open {
        overflow: hidden;
    }

    .error {
        border-color: #ef4444 !important;
    }

    /* Improve touch targets */
    @media (max-width: 768px) {
        .nav-links.mobile-open a:active {
            background: var(--gray-100);
        }
    }
`;
document.head.appendChild(style);
