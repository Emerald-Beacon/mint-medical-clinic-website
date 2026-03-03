// Mint Medical Clinic - Main JavaScript

document.addEventListener('DOMContentLoaded', function() {

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
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    const body = document.body;

    function toggleMobileMenu() {
        mobileMenuBtn.classList.toggle('active');
        navLinks.classList.toggle('mobile-open');
        body.classList.toggle('menu-open');
    }

    function closeMobileMenu() {
        mobileMenuBtn.classList.remove('active');
        navLinks.classList.remove('mobile-open');
        body.classList.remove('menu-open');
    }

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);

        // Close menu when clicking a nav link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', closeMobileMenu);
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (navLinks.classList.contains('mobile-open') &&
                !navLinks.contains(e.target) &&
                !mobileMenuBtn.contains(e.target)) {
                closeMobileMenu();
            }
        });

        // Close menu on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && navLinks.classList.contains('mobile-open')) {
                closeMobileMenu();
            }
        });

        // Mobile dropdown toggle
        const dropdownParents = navLinks.querySelectorAll('li.has-dropdown > a');
        dropdownParents.forEach(link => {
            link.addEventListener('click', function(e) {
                // Only handle on mobile
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                    const parent = this.parentElement;

                    // Close other dropdowns
                    navLinks.querySelectorAll('li.has-dropdown.dropdown-open').forEach(item => {
                        if (item !== parent) {
                            item.classList.remove('dropdown-open');
                        }
                    });

                    // Toggle this dropdown
                    parent.classList.toggle('dropdown-open');
                }
            });
        });
    }

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
                if (navLinks.classList.contains('mobile-open')) {
                    mobileMenuBtn.classList.remove('active');
                    navLinks.classList.remove('mobile-open');
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
