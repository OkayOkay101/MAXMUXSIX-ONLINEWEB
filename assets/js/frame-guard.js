// GitHub Pages cannot send anti-framing headers: hide the shop when another page frames it (clickjacking).
if (window.top !== window.self) document.documentElement.style.display = 'none';
