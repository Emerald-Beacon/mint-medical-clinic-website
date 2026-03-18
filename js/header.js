// Global Header Component
// This script injects a consistent header across all pages

document.addEventListener('DOMContentLoaded', function() {
    const header = document.querySelector('header.header');
    if (!header) return;

    // Determine if we're in a subdirectory
    const path = window.location.pathname;
    const isSubdir = path.includes('/services/') || path.includes('/Products/') || path.includes('/blog/');
    const prefix = isSubdir ? '../' : '';
    const rootPrefix = isSubdir ? '/' : '';

    // Replace the entire header content
    header.innerHTML = `
        <div class="container">
            <nav class="nav">
                <a href="/" class="logo">
                    <img src="${prefix}images/mint-medical-logo.png" alt="Mint Medical Clinic - Intimacy Health & Wellness Utah" title="Mint Medical Clinic">
                </a>
                <ul class="nav-links">
                    <li class="mobile-cta"><a href="https://new-consultation.zohobookings.com/#/mintmedicalclinic" target="_blank" rel="noopener" class="btn btn-primary">Book Consultation</a></li>
                    <li class="has-dropdown">
                        <a href="/services.html">Services</a>
                        <ul class="dropdown-menu">
                            <li><a href="/services/acoustic-wave-therapy.html">Acoustic Wave Therapy</a></li>
                            <li><a href="/services/ed-treatment.html">ED Treatment</a></li>
                            <li><a href="/services/low-testosterone.html">Low Testosterone</a></li>
                            <li><a href="/services/trt-clinic.html">TRT Clinic</a></li>
                            <li><a href="/services/hormone-therapy.html">Hormone Therapy</a></li>
                            <li><a href="/services/glp1-weight-loss.html">GLP-1 Weight Loss</a></li>
                            <li><a href="/services/medical-weight-loss.html">Medical Weight Loss</a></li>
                            <li><a href="/services/mens-health.html">Men's Health</a></li>
                            <li><a href="/services/womens-health.html">Women's Health</a></li>
                            <li><a href="/services/menopause-treatment.html">Menopause Treatment</a></li>
                            <li><a href="/services/peptides.html">Peptide Therapy</a></li>
                            <li><a href="/services/stem-cell-therapy.html">Stem Cell Therapy</a></li>
                            <li><a href="/services/telehealth-ed.html">Telehealth ED</a></li>
                        </ul>
                    </li>
                    <li class="has-dropdown">
                        <a href="/products.html">Products</a>
                        <ul class="dropdown-menu">
                            <li><a href="/Products/test-boost.html">Test Boost</a></li>
                            <li><a href="/Products/vaso-pump.html">Vaso Pump</a></li>
                            <li><a href="/Products/estro-block.html">Estro Block</a></li>
                            <li><a href="/Products/glp1-support-protein.html">GLP-1 Support Protein</a></li>
                            <li><a href="/Products/super-ionic-mint-minerals.html">Super Ionic Minerals</a></li>
                            <li><a href="/Products/colon-cleanse.html">Colon Cleanse</a></li>
                            <li style="border-top: 1px solid #eee; margin-top: 5px; padding-top: 5px;"><a href="/services/peptides.html"><strong>Peptides →</strong></a></li>
                        </ul>
                    </li>
                    <li><a href="/about.html">About</a></li>
                    <li><a href="/process.html">Our Process</a></li>
                    <li><a href="/results.html">Results</a></li>
                    <li><a href="/blog.html">Blog</a></li>
                </ul>
                <div class="nav-right">
                    <a href="tel:8018048000" class="phone">(801) 804-8000</a>
                    <button class="snipcart-checkout cart-btn" aria-label="Shopping cart">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                        </svg>
                        <span class="snipcart-items-count cart-count"></span>
                    </button>
                    <a href="https://new-consultation.zohobookings.com/#/mintmedicalclinic" target="_blank" rel="noopener" class="btn btn-primary">Book Consultation</a>
                </div>
                <button class="mobile-menu-btn" aria-label="Toggle menu">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </nav>
        </div>
    `;

    // Re-initialize mobile menu after header injection
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('mobile-open');
            mobileMenuBtn.classList.toggle('active');
        });
    }

    // Handle dropdowns on mobile
    const dropdowns = document.querySelectorAll('.has-dropdown');
    dropdowns.forEach(dropdown => {
        const link = dropdown.querySelector('a');
        link.addEventListener('click', function(e) {
            if (window.innerWidth <= 1024) {
                e.preventDefault();
                dropdown.classList.toggle('dropdown-open');
            }
        });
    });
});
