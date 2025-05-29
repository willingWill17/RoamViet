document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    let selectedStartDate = null;
    let selectedEndDate = null;
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();
    
    // DOM elements
    const provinceSelect = document.getElementById('provinceSelect');
    const displayedProvince = document.getElementById('displayedProvince');
    const calendarDays = document.getElementById('calendarDays');
    const currentMonthDisplay = document.getElementById('currentMonth');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const startDateDisplay = document.getElementById('startDate');
    const endDateDisplay = document.getElementById('endDate');
    const itineraryContent = document.getElementById('itineraryContent');
    
    // Generate calendar for current month
    function generateCalendar(month, year) {
        // Clear previous calendar days
        calendarDays.innerHTML = '';
        
        // Update month display
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        currentMonthDisplay.textContent = `${monthNames[month]} ${year}`;
        
        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Add empty cells for days before first day of month
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            calendarDays.appendChild(emptyDay);
        }
        
        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.textContent = day;
            dayElement.dataset.date = `${year}-${month + 1}-${day}`;
            
            // Check if this day is today
            const todayDate = new Date();
            if (day === todayDate.getDate() && month === todayDate.getMonth() && year === todayDate.getFullYear()) {
                dayElement.classList.add('today');
            }
            
            // Check if this day is in selected range
            if (selectedStartDate && selectedEndDate) {
                const currentDate = new Date(year, month, day);
                if (currentDate >= selectedStartDate && currentDate <= selectedEndDate) {
                    dayElement.classList.add('range');
                    
                    if (currentDate.getTime() === selectedStartDate.getTime() || 
                        currentDate.getTime() === selectedEndDate.getTime()) {
                        dayElement.classList.add('selected');
                    }
                }
            }
            
            // Add click event for day selection
            dayElement.addEventListener('click', function() {
                selectDate(new Date(year, month, day));
            });
            
            calendarDays.appendChild(dayElement);
        }
    }
    
    // Handle date selection
    function selectDate(date) {
        // If no start date is selected or both dates are selected already
        if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
            selectedStartDate = date;
            selectedEndDate = null;
            startDateDisplay.textContent = formatDate(date);
            endDateDisplay.textContent = 'Chọn ngày';
        } 
        // If only start date is selected
        else {
            // Ensure end date is after start date
            if (date < selectedStartDate) {
                selectedEndDate = selectedStartDate;
                selectedStartDate = date;
            } else {
                selectedEndDate = date;
            }
            
            startDateDisplay.textContent = formatDate(selectedStartDate);
            endDateDisplay.textContent = formatDate(selectedEndDate);
            
            // Update itinerary when both dates are selected
            updateItinerary();
        }
        
        // Regenerate calendar to show selection
        generateCalendar(currentMonth, currentYear);
    }
    
    // Format date for display
    function formatDate(date) {
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    }
    
    // Update itinerary content based on selected province and dates
    function updateItinerary() {
        if (displayedProvince.textContent !== 'Chọn địa điểm' && selectedStartDate && selectedEndDate) {
            const province = displayedProvince.textContent;
            const startDate = formatDate(selectedStartDate);
            const endDate = formatDate(selectedEndDate);
            
            // Calculate number of days in trip
            const tripDays = Math.floor((selectedEndDate - selectedStartDate) / (1000 * 60 * 60 * 24)) + 1;
            
            // Create itinerary template
            let itineraryHTML = `
            
            `;
            
            // Generate a sample itinerary for each day
            let currentDay = new Date(selectedStartDate);
            for (let i = 0; i < tripDays; i++) {
                const dayDate = formatDate(currentDay);
                
                itineraryHTML += ``;
                
                // Move to next day
                currentDay.setDate(currentDay.getDate() + 1);
            }
            
            itineraryHTML += `
            `;
            
            itineraryContent.innerHTML = itineraryHTML;
            
            // Add event listeners for itinerary actions
            document.querySelectorAll('.edit-item-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const item = this.closest('.schedule-item');
                    const day = item.dataset.day;
                    const timeSlot = item.dataset.time;
                    editScheduleItem(day, timeSlot);
                });
            });
            
            document.getElementById('addActivityBtn').addEventListener('click', addNewActivity);
            document.getElementById('optimizeBtn').addEventListener('click', optimizeItinerary);
        } else {
            itineraryContent.innerHTML = `
                <div class="empty-itinerary-message">
                    <p>Vui lòng chọn địa điểm và thời gian để xem và lập lịch trình</p>
                </div>
            `;
        }
    }
    
    // Event listeners
    provinceSelect.addEventListener('change', function() {
        const selectedOption = provinceSelect.options[provinceSelect.selectedIndex];
        displayedProvince.textContent = selectedOption.textContent;
        updateItinerary();
    });
    
    prevMonthBtn.addEventListener('click', function() {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        generateCalendar(currentMonth, currentYear);
    });
    
    nextMonthBtn.addEventListener('click', function() {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        generateCalendar(currentMonth, currentYear);
    });
    
    // Initialize calendar
    generateCalendar(currentMonth, currentYear);
});