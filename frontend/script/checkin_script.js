document.addEventListener('DOMContentLoaded', function() {
    // Get all necessary DOM elements
    const locationSelect = document.getElementById('location');
    const otherLocationContainer = document.getElementById('other-location-container');
    const dateInput = document.getElementById('checkin-date');
    const photoUpload = document.getElementById('photo-upload');
    const previewContainer = document.querySelector('.preview-container');
    const uploadArea = document.querySelector('.upload-area');
    const experienceTextarea = document.getElementById('experience');
    const submitButton = document.querySelector('.form-actions .detail-btn');
    const stars = document.querySelectorAll('.star');
    
    // Track selected rating
    let selectedRating = 0;
    
    // Handle location selection changes
    if (locationSelect) {
        locationSelect.addEventListener('change', function() {
            if (this.value === 'other') {
                // Show other location input if "Other" is selected
                if (otherLocationContainer) {
                    otherLocationContainer.style.display = 'block';
                }
            } else {
                // Hide other location input
                if (otherLocationContainer) {
                    otherLocationContainer.style.display = 'none';
                }
            }
            
            // Add animation effect
            this.classList.add('selected');
            setTimeout(() => {
                this.classList.remove('selected');
            }, 500);
        });
    }
    
    // Handle date input formatting (DD-MM-YYYY)
    if (dateInput) {
        // Format input as user types
        dateInput.addEventListener('input', function(e) {
            let value = e.target.value;
            
            // Remove all non-digits
            value = value.replace(/\D/g, '');
            
            // Add hyphens after day and month
            if (value.length > 2) {
                value = value.substring(0, 2) + '-' + value.substring(2);
            }
            if (value.length > 5) {
                value = value.substring(0, 5) + '-' + value.substring(5);
            }
            
            // Limit to 10 characters (DD-MM-YYYY)
            if (value.length > 10) {
                value = value.substring(0, 10);
            }
            
            e.target.value = value;
        });
        
        // Validate date when user finishes input
        dateInput.addEventListener('blur', function() {
            const value = this.value;
            
            if (value.length === 10) {
                const parts = value.split('-');
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10);
                const year = parseInt(parts[2], 10);
                
                // Check if date is valid
                const isValidDate = validateDate(day, month, year);
                
                if (!isValidDate) {
                    this.classList.add('has-error');
                    
                    // Add error message if not already present
                    const errorElement = this.parentNode.querySelector('.error-message');
                    if (!errorElement) {
                        addErrorMessage(this, 'Ngày không hợp lệ');
                    }
                } else {
                    // Remove error message if date is valid
                    this.classList.remove('has-error');
                    const errorElement = this.parentNode.querySelector('.error-message');
                    if (errorElement) {
                        errorElement.remove();
                    }
                }
            }
        });
    }
    
    // Handle star rating system
    stars.forEach(star => {
        // Highlight stars on hover
        star.addEventListener('mouseover', function() {
            const value = parseInt(this.getAttribute('data-value'));
            
            stars.forEach(s => {
                const starValue = parseInt(s.getAttribute('data-value'));
                if (starValue <= value) {
                    s.classList.add('hover');
                } else {
                    s.classList.remove('hover');
                }
            });
        });
        
        // Remove highlight when not hovering
        star.addEventListener('mouseout', function() {
            stars.forEach(s => s.classList.remove('hover'));
        });
        
        // Handle click to set rating
        star.addEventListener('click', function() {
            const value = parseInt(this.getAttribute('data-value'));
            selectedRating = value;
            
            // Reset all stars
            stars.forEach(s => s.classList.remove('active'));
            
            // Activate stars up to selected value
            stars.forEach(s => {
                if (parseInt(s.getAttribute('data-value')) <= value) {
                    s.classList.add('active');
                }
            });
            
            // Add animation effect
            stars.forEach(s => {
                if (parseInt(s.getAttribute('data-value')) <= value) {
                    s.classList.add('pulse');
                    setTimeout(() => {
                        s.classList.remove('pulse');
                    }, 300);
                }
            });
        });
    });
    
    // Handle file upload and image preview
    if (photoUpload && uploadArea) {
        // Handle file selection via input
        photoUpload.addEventListener('change', function() {
            handleFileUpload(this.files);
        });
        
        // Handle drag and drop
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.style.borderColor = '#ffd900';
            this.style.backgroundColor = 'rgba(255, 217, 0, 0.1)';
            
            // Get and modify the icon in upload text
            const uploadIcon = this.querySelector('.upload-text i');
            if (uploadIcon) {
                uploadIcon.style.color = '#ffd900';
            }
        });
        
        uploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.style.borderColor = 'rgba(255, 255, 255, 0.7)';
            this.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            
            // Reset icon color
            const uploadIcon = this.querySelector('.upload-text i');
            if (uploadIcon) {
                uploadIcon.style.color = 'rgba(255, 255, 255, 0.9)';
            }
        });
        
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.style.borderColor = 'rgba(255, 255, 255, 0.7)';
            this.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            
            // Reset icon color
            const uploadIcon = this.querySelector('.upload-text i');
            if (uploadIcon) {
                uploadIcon.style.color = 'rgba(255, 255, 255, 0.9)';
            }
            
            if (e.dataTransfer.files) {
                handleFileUpload(e.dataTransfer.files);
            }
        });
    }
    
    // Handle form submission
    if (submitButton) {
        submitButton.addEventListener('click', function() {
            // Get form values
            const location = locationSelect.value === 'other' 
                ? document.getElementById('other-location')?.value 
                : locationSelect.options[locationSelect.selectedIndex]?.text;
            const date = dateInput?.value;
            const experience = experienceTextarea?.value;
            
            // Clear previous errors
            document.querySelectorAll('.error-message').forEach(el => el.remove());
            document.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
            
            // Validate form
            let isValid = true;
            
            // Check location
            if (!locationSelect.value || locationSelect.value === "") {
                isValid = false;
                addErrorMessage(locationSelect, 'Vui lòng chọn địa điểm');
            }
            
            // Check date
            if (!date) {
                isValid = false;
                addErrorMessage(dateInput, 'Vui lòng chọn ngày check-in');
            } else {
                // Validate date format and validity
                if (date.length === 10) {
                    const parts = date.split('-');
                    if (parts.length === 3) {
                        const day = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10);
                        const year = parseInt(parts[2], 10);
                        
                        const isValidDate = validateDate(day, month, year);
                        
                        if (!isValidDate) {
                            isValid = false;
                            addErrorMessage(dateInput, 'Ngày không hợp lệ');
                        }
                    } else {
                        isValid = false;
                        addErrorMessage(dateInput, 'Định dạng ngày không hợp lệ');
                    }
                } else {
                    isValid = false;
                    addErrorMessage(dateInput, 'Vui lòng nhập ngày theo định dạng DD-MM-YYYY');
                }
            }
            
            // Check photos
            const imageCount = document.querySelectorAll('.image-preview').length;
            if (imageCount === 0) {
                isValid = false;
                addErrorMessage(uploadArea, 'Vui lòng tải lên ít nhất một hình ảnh');
            }
            
            // Check experience
            if (!experience) {
                isValid = false;
                addErrorMessage(experienceTextarea, 'Vui lòng chia sẻ trải nghiệm của bạn');
            }
            
            // Check rating
            if (selectedRating === 0) {
                isValid = false;
                addErrorMessage(document.querySelector('.stars'), 'Vui lòng đánh giá địa điểm');
            }
            
            if (isValid) {
                // Disable button and show loading state
                submitButton.disabled = true;
                const originalText = submitButton.innerHTML;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
                
                // Simulate form submission (replace with actual API call)
                setTimeout(() => {
                    // Show success message
                    showNotification('Đã đăng ký niệm thành công! Cảm ơn bạn đã chia sẻ.', 'success');
                    
                    // Reset form
                    resetForm();
                    
                    // Reset button
                    submitButton.disabled = false;
                    submitButton.innerHTML = originalText;
                    
                    // Scroll to top of page
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                }, 1500);
            }
        });
    }
    
    // UTILITY FUNCTIONS
    
    // Function to handle file upload and preview
    function handleFileUpload(files) {
        if (!files || files.length === 0) return;
        
        // Clear previous previews (optional - can keep this commented out to allow multiple uploads)
        // previewContainer.innerHTML = '';
        
        // Show loading indicator
        const loadingElement = document.createElement('div');
        loadingElement.className = 'loading-indicator';
        loadingElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
        previewContainer.appendChild(loadingElement);
        
        let loadedImages = 0;
        const totalImages = Array.from(files).filter(file => file.type.startsWith('image/')).length;
        
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    // Create image container
                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'image-preview';
                    
                    // Create image
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.alt = file.name;
                    
                    // Add remove button
                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'remove-image';
                    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                    removeBtn.onclick = function(event) {
                        event.stopPropagation(); // Prevent event bubbling
                        imgContainer.remove();
                        
                        // If all images are removed, add error message
                        if (document.querySelectorAll('.image-preview').length === 0) {
                            // Check if error message already exists
                            const errorElement = uploadArea.parentNode.querySelector('.error-message');
                            if (!errorElement) {
                                addErrorMessage(uploadArea, 'Vui lòng tải lên ít nhất một hình ảnh');
                            }
                        }
                    };
                    
                    // Append elements
                    imgContainer.appendChild(img);
                    imgContainer.appendChild(removeBtn);
                    
                    // Add fade-in animation
                    imgContainer.style.opacity = '0';
                    
                    // Check if loading indicator exists and remove it when all images are loaded
                    loadedImages++;
                    if (loadedImages === totalImages) {
                        const loadingIndicator = document.querySelector('.loading-indicator');
                        if (loadingIndicator) {
                            loadingIndicator.remove();
                        }
                    }
                    
                    previewContainer.appendChild(imgContainer);
                    
                    // Trigger animation
                    setTimeout(() => {
                        imgContainer.style.opacity = '1';
                    }, 10);
                    
                    // Remove any error message for photos
                    const errorElement = uploadArea.parentNode.querySelector('.error-message');
                    if (errorElement) {
                        errorElement.remove();
                    }
                    uploadArea.classList.remove('has-error');
                };
                
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Function to validate date
    function validateDate(day, month, year) {
        // Check year (between 1900 and current year + 10)
        const currentYear = new Date().getFullYear();
        if (year < 1900 || year > currentYear + 10) {
            return false;
        }
        
        // Check month (1-12)
        if (month < 1 || month > 12) {
            return false;
        }
        
        // Check day based on month (accounting for leap years)
        const daysInMonth = new Date(year, month, 0).getDate();
        if (day < 1 || day > daysInMonth) {
            return false;
        }
        
        // Check if date is in the future
        const inputDate = new Date(year, month - 1, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // For check-in, we typically allow past and present dates, but not future
        // This can be adjusted based on requirements
        // if (inputDate > today) {
        //     return false;
        // }
        
        return true;
    }
    
    // Function to add error message
    function addErrorMessage(element, message) {
        element.classList.add('has-error');
        
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        
        element.parentNode.appendChild(errorMessage);
        
        // Add fade-in animation
        errorMessage.style.opacity = '0';
        setTimeout(() => {
            errorMessage.style.opacity = '1';
        }, 10);
    }
    
    // Function to show notification
    function showNotification(message, type) {
        // Remove any existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
        notification.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
        
        document.body.appendChild(notification);
        
        // Animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Auto-remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
    
    // Function to reset form
    function resetForm() {
        // Reset location
        if (locationSelect) {
            locationSelect.selectedIndex = 0;
        }
        
        // Reset other location if exists
        if (otherLocationContainer) {
            otherLocationContainer.style.display = 'none';
            const otherLocationInput = document.getElementById('other-location');
            if (otherLocationInput) {
                otherLocationInput.value = '';
            }
        }
        
        // Reset date
        if (dateInput) {
            dateInput.value = '';
        }
        
        // Reset rating
        stars.forEach(s => s.classList.remove('active'));
        selectedRating = 0;
        
        // Clear all image previews
        previewContainer.innerHTML = '';
        
        // Reset experience text
        if (experienceTextarea) {
            experienceTextarea.value = '';
        }
        
        // Clear all error messages
        document.querySelectorAll('.error-message').forEach(el => el.remove());
        document.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
    }
});