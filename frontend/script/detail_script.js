document.addEventListener('DOMContentLoaded', function() {
    // Add smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
    
    // Get the province ID from the URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const provinceId = urlParams.get('id');
    
    if (provinceId) {
        fetchProvinceData(provinceId);
    } else {
        console.error('No province ID specified in the URL');
        document.querySelector('.province-name').textContent = 'Province not found';
        document.querySelector('.province-description').textContent = 'Please select a valid province';
    }
    
    // Modified back button functionality to go to all_63.html
    document.getElementById("backButton").addEventListener("click", function () {
        window.location.href = "all_63.html";
    });
    
    // Add hover effects for thumbnails
    const thumbnails = document.querySelectorAll('.thumbnail');
    thumbnails.forEach(thumb => {
        thumb.addEventListener('mouseenter', function() {
            this.style.zIndex = '10';
        });
        
        thumb.addEventListener('mouseleave', function() {
            this.style.zIndex = '1';
        });
    });
});

function fetchProvinceData(provinceId) {
    // Show loading state
    showLoading(true);
    
    // In a real application, you would make an AJAX request to your server
    // which would query the province.sql database
    
    // Example AJAX request using fetch API
    fetch(`/api/provinces/${provinceId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            showLoading(false);
            displayProvinceData(data);
        })
        .catch(error => {
            showLoading(false);
            console.error('Error fetching province data:', error);
            document.querySelector('.province-name').textContent = 'Error loading data';
            
            // Show error message
            showErrorMessage('Could not load province data. Please try again later.');
        });
}

function showLoading(isLoading) {
    const elements = [
        document.querySelector('.province-name'),
        document.querySelector('.province-description'),
        document.querySelector('.main-image .image-placeholder'),
        document.querySelector('.main-image .image-name')
    ];
    
    if (isLoading) {
        elements.forEach(el => {
            if (el) {
                el.classList.add('loading');
                el.dataset.originalText = el.textContent;
                el.textContent = 'Loading...';
            }
        });
    } else {
        elements.forEach(el => {
            if (el && el.classList.contains('loading')) {
                el.classList.remove('loading');
                // Don't restore text here as it will be set by displayProvinceData
            }
        });
    }
}

function showErrorMessage(message) {
    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    // Add to container
    document.querySelector('.container').prepend(errorDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        errorDiv.style.opacity = '0';
        setTimeout(() => {
            errorDiv.remove();
        }, 300);
    }, 5000);
}

function displayProvinceData(province) {
    // Update the main province information with fade effect
    fadeInElement(document.querySelector('.province-name'), province.name);
    fadeInElement(document.querySelector('.province-description'), province.description);
    
    // Update the main image
    const mainImage = document.querySelector('.main-image');
    
    if (province.mainImage && province.mainImage.url) {
        const img = new Image();
        img.src = province.mainImage.url;
        img.alt = province.mainImage.name;
        img.onload = function() {
            fadeInElement(mainImage.querySelector('.image-placeholder'), '');
            mainImage.querySelector('.image-placeholder').innerHTML = '';
            mainImage.querySelector('.image-placeholder').appendChild(img);
            fadeInElement(mainImage.querySelector('.image-name'), province.mainImage.name);
        };
    } else {
        fadeInElement(mainImage.querySelector('.image-placeholder'), 'No image available');
        fadeInElement(mainImage.querySelector('.image-name'), 'Default');
    }
    
    // Update thumbnails with staggered animation
    const thumbnailContainers = document.querySelectorAll('.thumbnail');
    
    province.images.forEach((image, index) => {
        if (index < thumbnailContainers.length) {
            const thumb = thumbnailContainers[index];
            const placeholder = thumb.querySelector('.image-placeholder');
            const nameEl = thumb.querySelector('.image-name');
            
            setTimeout(() => {
                const img = new Image();
                img.src = image.url;
                img.alt = image.name;
                img.onload = function() {
                    fadeInElement(placeholder, '');
                    placeholder.innerHTML = '';
                    placeholder.appendChild(img);
                    fadeInElement(nameEl, image.name);
                };
                
                // Add click functionality to load this image as main
                thumb.addEventListener('click', function() {
                    updateMainImage(image);
                });
            }, index * 200); // Staggered loading effect
        }
    });
}

function updateMainImage(image) {
    const mainImage = document.querySelector('.main-image');
    const placeholder = mainImage.querySelector('.image-placeholder');
    const nameEl = mainImage.querySelector('.image-name');
    
    // Add fade out effect
    placeholder.style.opacity = 0;
    nameEl.style.opacity = 0;
    
    setTimeout(() => {
        // Update content
        placeholder.innerHTML = '';
        const img = new Image();
        img.src = image.url;
        img.alt = image.name;
        placeholder.appendChild(img);
        nameEl.textContent = image.name;
        
        // Fade back in
        placeholder.style.opacity = 1;
        nameEl.style.opacity = 1;
    }, 300);
}

function fadeInElement(element, text) {
    if (!element) return;
    
    element.style.opacity = 0;
    
    setTimeout(() => {
        if (text !== undefined) {
            element.textContent = text;
        }
        element.style.opacity = 1;
    }, 300);
}