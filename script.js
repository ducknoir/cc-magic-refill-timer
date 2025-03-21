const TimerApp = (function () {
    // Timer state
    let countdown;

    // The timestamp when the timer begins, captured using performance.now()
    let startTime;
    // Duration of countdown in seconds, calculated based on which spell is cast and max magic
    let timerDurationSeconds = 0;
    let isTimerActive = false; // Tracks if timer has been started since last reset

    let isPaused = false;
    let pausedTimeRemaining = 0;

    // Alert state
    let alertInterval;
    let isMuted = false;
    let currentVolume = 1; // Default volume
    
    // FtHoF state
    let currentPosition = 0; // Current position in FtHoF queue
    
    // Cached DOM elements
    let elements = {};
    
    // LocalStorage key
    const STORAGE_KEY = 'magic-recharge-timer-settings';
    
    /*** DOM Caching ***/
    function cacheElements() {
        // Cache all frequently accessed DOM elements
        elements = {
            timer: document.getElementById("timer"),
            customValue: document.getElementById("customValue"),
            timeSelect: document.getElementById("timeSelect"),
            alertMode: document.getElementById("alertMode"),
            alertSound: document.getElementById("alertSound"),
            volumeControl: document.getElementById("volumeControl"),
            volumeIcon: document.getElementById("volumeIcon"),
            currentPositionInput: document.getElementById("currentPosition"),
            targetPositionInput: document.getElementById("targetPosition"),
            startButton: document.querySelector('button.btn-primary')
        };
    }

    /*** LocalStorage Functions ***/
    function saveSettings() {
        // Create an object with all settings to save
        const settings = {
            maxMagic: elements.customValue.value,
            selectedSpellIndex: elements.timeSelect.selectedIndex,
            alertMode: elements.alertMode.value,
            volume: currentVolume,
            isMuted: isMuted,
            currentPosition: currentPosition,
            targetPosition: elements.targetPositionInput.value
        };
        
        // Save to localStorage
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (error) {
            console.error('Failed to save settings to localStorage:', error);
        }
    }
    
    function loadSettings() {
        try {
            const savedSettings = localStorage.getItem(STORAGE_KEY);
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                
                // Apply saved settings
                if (settings.maxMagic) {
                    elements.customValue.value = settings.maxMagic;
                }
                
                if (settings.alertMode) {
                    elements.alertMode.value = settings.alertMode;
                }
                
                if (settings.volume !== undefined) {
                    currentVolume = parseFloat(settings.volume);
                    elements.volumeControl.value = currentVolume;
                }
                
                if (settings.isMuted !== undefined) {
                    isMuted = settings.isMuted;
                }
                
                if (settings.currentPosition !== undefined) {
                    currentPosition = parseInt(settings.currentPosition);
                    elements.currentPositionInput.value = currentPosition;
                }
                
                if (settings.targetPosition !== undefined) {
                    elements.targetPositionInput.value = settings.targetPosition;
                }
                
                // Update the spell list first
                updateSpellList();
                
                // Then set the selected spell index (after list is populated)
                if (settings.selectedSpellIndex !== undefined && elements.timeSelect.options.length > settings.selectedSpellIndex) {
                    elements.timeSelect.selectedIndex = settings.selectedSpellIndex;
                    updateDisplayFromSelection();
                }
                
                // Update UI elements based on loaded settings
                updateVolumeIcon();
                checkTargetReached();
            }
        } catch (error) {
            console.error('Failed to load settings from localStorage:', error);
        }
    }

    /*** Utility Functions ***/
    function formatTime(seconds) {
        let min = Math.floor(seconds / 60);
        let sec = Math.round(seconds % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    }

    /*** Spell List Calculation ***/
    /*** formulas from https://www.desmos.com/calculator/ubnnt6a52d ***/
    function calculateMagicRemaining(maxMagic, spellObj) {
        console.log("spell: ", spellObj);
        let magicUsed = Math.floor(maxMagic * spellObj.slope + spellObj.offset);
        magicUsed = spellObj.count ? spellObj.count * magicUsed : magicUsed;

        console.log(`magicUsed: ${magicUsed}`);
        let magicRemaining = maxMagic - magicUsed;
        return Math.max(magicRemaining, 1); // Ensure it's at least 1
    }

    function calculateM(maxMagic) {
        return Math.max(maxMagic, 100);
    }

    function calculateTimeSeconds(maxMagic, magicRemaining) {
        let M = calculateM(maxMagic);
        if (magicRemaining >= maxMagic) return 0; // If no depletion, no time required
        return Math.round(
            ((5 * Math.sqrt(M)) / 9) * (Math.sqrt(maxMagic) - Math.sqrt(magicRemaining)) * 60
        );
    }

    function updateSpellList() {
        const maxMagic = parseInt(elements.customValue.value);
        if (isNaN(maxMagic) || maxMagic <= 0) {
            elements.timer.textContent = "Invalid Max Magic value";
            return;
        }

        elements.timeSelect.innerHTML = "";

        const spells = [
            { name: "Spontaneous Edifice", slope: 0.75, offset: 20 },
            { name: "Force the Hand of Fate", slope: 0.6, offset: 10 },
            { name: "Conjure Baked Goods", slope: 0.4, offset: 2 },
            { name: "Resurrect Abomination", slope: 0.1, offset: 20 },
            { name: "Summon Crafty Pixies", slope: 0.2, offset: 10 },
            { name: "Stretch Time", slope: 0.2, offset: 8 },
            { name: "Diminish Ineptitude", slope: 0.2, offset: 5 },
            { name: "Haggler's Charm x3", slope: 0.1, offset: 10, count: 3 },
            { name: "Haggler's Charm x2", slope: 0.1, offset: 10, count: 2 },
            { name: "Haggler's Charm", slope: 0.1, offset: 10, selected: true },
            { name: "Gambler's Fever Dream", slope: 0.05, offset: 3 },
        ];

        spells.forEach((spell) => {
            let magicRemaining = calculateMagicRemaining(maxMagic, spell);
            let timeSeconds = calculateTimeSeconds(maxMagic, magicRemaining);
            let option = document.createElement("option");
            option.value = timeSeconds;
            option.textContent = `${formatTime(timeSeconds)} - ${spell.name} (${Math.round(magicRemaining)})`;
            if (spell.selected) {
                option.selected = true;
            }
            elements.timeSelect.appendChild(option);
        });

        updateDisplayFromSelection(); // Ensure display updates after list is refreshed
        
        // Save settings after updating spell list
        saveSettings();
    }

    /*** Timer Controls ***/
    function updateDisplayFromSelection() {
        if (elements.timeSelect.selectedIndex === -1) return; // No selection available
        timerDurationSeconds = parseInt(elements.timeSelect.value);
        if (isNaN(timerDurationSeconds) || timerDurationSeconds <= 0) {
            elements.timer.textContent = "Invalid time selected";
            return;
        }
        elements.timer.textContent = formatTime(timerDurationSeconds);
        updateTabTitle(timerDurationSeconds);
        
        // Save settings after changing selection
        saveSettings();
    }

    function startTimer() {
        // If timer is running, pause it
        if (countdown && !isPaused) {
            pauseTimer();
            return;
        }
        
        // If timer is paused, resume it
        if (isPaused) {
            resumeTimer();
            return;
        }
        
        // Otherwise start a new timer
        if (countdown) clearInterval(countdown);
        stopAlert(); // Stop any playing alerts
        
        const selectedTime = parseInt(elements.timeSelect.value);
        if (isNaN(selectedTime) || selectedTime <= 0) {
            elements.timer.textContent = "Invalid time selected";
            return;
        }
        
        startTime = performance.now();
        timerDurationSeconds = selectedTime;
        isPaused = false;
        countdown = true; // Set countdown to true to indicate timer is running
        isTimerActive = true; // Mark timer as active

        // Update the start button text to "Pause" immediately
        updateStartButtonText();
        
        runCountdown();
    }
 
    function pauseTimer() {
        if (!countdown) return;
        
        clearInterval(countdown);
        
        // Calculate the time remaining when paused
        let elapsed = (performance.now() - startTime) / 1000;
        pausedTimeRemaining = Math.max(0, timerDurationSeconds - elapsed);
        
        isPaused = true;
        
        // Update the start button text
        updateStartButtonText();
    }

    function resumeTimer() {
        if (!isPaused) return;
        
        // Set the new start time based on the remaining time
        startTime = performance.now() - ((timerDurationSeconds - pausedTimeRemaining) * 1000);
        
        isPaused = false;
        
        // Update the start button text
        updateStartButtonText();
        
        runCountdown();
    }

    function updateStartButtonText() {
        const startButton = document.querySelector('button.btn-primary');
        if (!startButton) return;
        
        if (countdown && !isPaused) {
            startButton.textContent = "Pause";
        } else if (isPaused) {
            startButton.textContent = "Resume";
        } else {
            startButton.textContent = "Start";
        }
    }

    function updateResetButtonState() {
        const resetButton = document.querySelector('button.btn-secondary');
        if (!resetButton) return;
        
        if (isTimerActive) {
            // Timer is or has been active since last reset - show as primary button
            resetButton.classList.remove('btn-secondary');
            resetButton.classList.add('btn-primary');
            resetButton.disabled = false;
        } else {
            // Timer is already in reset state - show as secondary (gray) button
            resetButton.classList.remove('btn-primary');
            resetButton.classList.add('btn-secondary');
        }
    }
    
    function runCountdown() {
        // Clear any existing interval
        if (countdown && typeof countdown === 'number') {
            clearInterval(countdown);
        }
        
        // Create new interval
        countdown = setInterval(() => {
            let elapsed = (performance.now() - startTime) / 1000;
            let newTime = Math.max(0, timerDurationSeconds - elapsed);
            elements.timer.textContent = formatTime(Math.round(newTime));
            updateTabTitle(newTime);
    
            if (newTime <= 0) {
                clearInterval(countdown);
                countdown = null; // Clear the countdown flag
                isPaused = false;
                elements.timer.textContent = "Time's Up!";
                updateStartButtonText(); // Update button text when timer completes
                playAlert();
                incrementPosition(); // Increment the position counter when timer completes
            }
        }, 1000);
    }

    function updateTabTitle(time) {
        document.title = time > 0 ? `⏳ ${formatTime(time)} - Magic Timer` : "Time's Up! ⏰";
    }

    /*** Alert System ***/
    function playAlert() {
        let alertMode = elements.alertMode.value;
        if (alertMode === "off") return;
        
        // Apply the current volume setting
        elements.alertSound.volume = isMuted ? 0 : currentVolume;
        
        elements.alertSound.play().catch(error => console.log("Playback prevented:", error));

        if (alertMode === "repeat") {
            alertInterval = setInterval(() => {
                elements.alertSound.play().catch(error => console.log("Playback prevented:", error));
            }, 3000);
        }
    }

    function resetTimer() {
        if (countdown && typeof countdown === 'number') {
            clearInterval(countdown);
        }
        stopAlert();
        countdown = null; // Clear the countdown flag
        isPaused = false;
        pausedTimeRemaining = 0;
        
        // Update the display to show the selected time from dropdown instead of "Select a spell"
        updateDisplayFromSelection();
        
        // Update the start button text
        updateStartButtonText();
        
        // Reset the position highlight when resetting the timer
        elements.currentPositionInput.classList.remove("bg-danger", "text-white");
    }

    function stopAlert() {
        clearInterval(alertInterval);
        elements.alertSound.pause();
        elements.alertSound.currentTime = 0;
    }

    /*** Volume Control System ***/
    function updateVolume(value) {
        currentVolume = parseFloat(value);
        
        // Update audio volume (if not muted)
        if (!isMuted) {
            elements.alertSound.volume = currentVolume;
        }
        
        // Update volume icon based on current level
        updateVolumeIcon();
        
        // Save settings after changing volume
        saveSettings();
    }
    
    function toggleMute() {
        isMuted = !isMuted;
        
        // Set volume to 0 if muted, otherwise restore to slider value
        elements.alertSound.volume = isMuted ? 0 : currentVolume;
        
        // Update the volume icon
        updateVolumeIcon();
        
        // Save settings after toggling mute
        saveSettings();
    }
    
    // Simplified volume icon update function
    function updateVolumeIcon() {
        const icon = elements.volumeIcon;
        
        // Clear existing paths
        icon.innerHTML = '';
        
        // Set the appropriate icon based on the volume state
        if (isMuted) {
            // Muted icon
            icon.innerHTML = `
                <path d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z"/>
                <path d="M10.717 3.55a.5.5 0 0 1 .5.46v8a.5.5 0 0 1-.812.39l-1.318-1.057-1.41 1.41 1.528 1.226A2 2 0 0 0 12 12.5V3.5a2 2 0 0 0-2.973-1.75L7.44 3.16l1.41 1.41 1.868-1.02z"/>
                <path d="M10.707 5.707a1 1 0 0 0-1.414-1.414l-4 4a1 1 0 0 0 1.414 1.414l4-4z"/>
            `;
        } else if (currentVolume === 0) {
            // Volume zero icon
            icon.innerHTML = `
                <path d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z"/>
            `;
        } else if (currentVolume < 0.5) {
            // Low volume icon
            icon.innerHTML = `
                <path d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z"/>
                <path d="M8.707 11.182A4.486 4.486 0 0 0 10.025 8a4.486 4.486 0 0 0-1.318-3.182L8 5.525A3.489 3.489 0 0 1 9.025 8 3.49 3.49 0 0 1 8 10.475l.707.707z"/>
            `;
        } else {
            // High volume icon
            icon.innerHTML = `
                <path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z"/>
                <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.89l.706.706z"/>
                <path d="M10.025 8a4.486 4.486 0 0 1-1.318 3.182L8 10.475A3.489 3.489 0 0 0 9.025 8c0-.966-.392-1.841-1.025-2.475l.707-.707A4.486 4.486 0 0 1 10.025 8zM7 4a.5.5 0 0 0-.812-.39L3.825 5.5H1.5A.5.5 0 0 0 1 6v4a.5.5 0 0 0 .5.5h2.325l2.363 1.89A.5.5 0 0 0 7 12V4zM4.312 6.39 6 5.04v5.92L4.312 9.61A.5.5 0 0 0 4 9.5H2v-3h2a.5.5 0 0 0 .312-.11z"/>
            `;
        }
    }
    

    /*** FtHoF Queue Position Tracking ***/
    function updatePosition(value) {
        currentPosition = parseInt(value);
        if (isNaN(currentPosition)) currentPosition = 0;
        
        // Update the position display
        elements.currentPositionInput.value = currentPosition;
        
        // Check if we've reached the target
        checkTargetReached();
        
        // Save settings after updating position
        saveSettings();
    }
    
    function incrementPosition() {
        currentPosition++;
        updatePosition(currentPosition);
    }
    
    function checkTargetReached() {
        const targetPosition = parseInt(elements.targetPositionInput.value);
        
        // Only highlight and play alert if both values are non-zero and they match
        if (!isNaN(targetPosition) && targetPosition > 0 && currentPosition === targetPosition) {
            // Highlight the position display to indicate target reached
            elements.currentPositionInput.classList.add("bg-danger", "text-white");
            
            // If the timer is not running, play a notification
            if (!countdown) {
                elements.alertSound.volume = isMuted ? 0 : currentVolume;
                elements.alertSound.play().catch(error => console.log("Playback prevented:", error));
            }
        } else {
            // Remove highlight if not at target
            elements.currentPositionInput.classList.remove("bg-danger", "text-white");
        }
        
        // Save settings after updating target position
        saveSettings();
    }

    /*** Initialize on Page Load ***/
    document.addEventListener("DOMContentLoaded", () => {
        // Cache DOM elements
        cacheElements();
        
        // Load saved settings (before initializing the rest of the app)
        loadSettings();
        
        // If no settings were loaded, initialize with defaults
        if (!localStorage.getItem(STORAGE_KEY)) {
            // Initialize app with defaults
            updateSpellList();
            
            // Initialize volume control
            elements.alertSound.volume = currentVolume;
            
            // Set initial value of volume slider
            if (elements.volumeControl) {
                elements.volumeControl.value = currentVolume;
            }

            updateVolumeIcon();

            // Initialize position tracking
            if (elements.currentPositionInput) {
                elements.currentPositionInput.value = currentPosition;
            }
        }
        
        // Set up event listeners for the target position input
        if (elements.targetPositionInput) {
            elements.targetPositionInput.addEventListener('change', function() {
                checkTargetReached();
                saveSettings();
            });
        }
        
        // Set up event listener for alert mode changes
        if (elements.alertMode) {
            elements.alertMode.addEventListener('change', function() {
                saveSettings();
            });
        }
    });

    return {
        updateSpellList,
        updateDisplayFromSelection,
        startTimer,
        resetTimer,
        updateVolume,
        toggleMute,
        updatePosition,
        checkTargetReached
    };
})();
