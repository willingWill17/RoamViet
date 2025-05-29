document.addEventListener('DOMContentLoaded', function() {
    // Array of background images
    const backgrounds = [
        'main_site_image/back1.png',
        'main_site_image/back2.png',
        'main_site_image/back3.png',
        'main_site_image/back4.png',
        'main_site_image/back5.png'
    ];
    
    const backgroundSlider = document.querySelector('.background-slider');
    let currentBg = 0;
    
    // Function to change background
    function changeBackground() {
        currentBg = (currentBg + 1) % backgrounds.length;
        backgroundSlider.style.backgroundImage = `url('${backgrounds[currentBg]}')`;
    }
    
    // Change background every 5 seconds
    setInterval(changeBackground, 5000);
    
    // Set initial background
    backgroundSlider.style.backgroundImage = `url('${backgrounds[0]}')`;
    
    // Add click event listeners for the nav links (for demonstration)
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            console.log(`Navigating to ${this.getAttribute('href')}`);
            // Navigation happens automatically through the href attribute
        });
    });
    
    // Add click event for the detail button
    const detailBtn = document.querySelector('.detail-btn');
    if (detailBtn) {
        detailBtn.addEventListener('click', function(e) {
            console.log('Navigating to all_63.html');
            // Navigation happens automatically through the href attribute
        });
    }
});