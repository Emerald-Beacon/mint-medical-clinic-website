#!/usr/bin/env node
// One-off publisher for a single blog article to the live Mint Medical blog API.
// Usage: node scripts/publish-post.js <featuredImageUrl>
const fs = require('fs');
const path = require('path');

const featuredImage = process.argv[2] || '';
const contentPath = path.join(__dirname, '..', 'blog-drafts', 'low-testosterone-9-signs-blood-panel.html');
const content = fs.readFileSync(contentPath, 'utf8');

const article = {
  slug: 'low-testosterone-9-signs-blood-panel',
  title: 'Low Testosterone in Men: 9 Signs You Should Get a Blood Panel',
  content,
  excerpt: 'Fatigue, low sex drive, and stubborn belly fat can all signal low testosterone. Here are 9 signs it is time to get a blood panel — plus what the test measures and what 2025 research says about treatment safety.',
  category: 'hormone-therapy',
  author: 'Mint Medical Clinic',
  featuredImage,
  tags: ['low testosterone', 'testosterone', 'TRT', "men's health", 'hormone therapy', 'Utah'],
  publishedAt: '2026-06-18T13:00:00Z',
  updatedAt: new Date().toISOString()
};

const body = JSON.stringify({ action: 'create', article, token: process.env.BLOG_TOKEN || 'mint-medical-blog-2024' });

(async () => {
  const res = await fetch('https://www.mintmedicalclinic.com/api/blog-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
  const text = await res.text();
  console.log('HTTP', res.status);
  console.log(text);
})();
