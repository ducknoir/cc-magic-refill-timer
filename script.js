const TimerApp = (function () {
    // Timer state
    let countdown;

    // The timestamp when the timer begins, captured using performance.now()
    let startTime;
    // Duration of countdown in seconds, calculated based on which spell is cast and max magic
    let timerDurationSeconds = 0;
    
    // Alert state
    let alertInterval;
    let isMuted = false;
    let currentVolume = 1; // Default volume
    
    // FtHoF state
    let currentPosition = 0; // Current position in FtHoF queue
    
    // Cached DOM elements
    let elements = {};
    
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
            targetPositionInput: document.getElementById("targetPosition")
        };
    }

    /*** Utility Functions ***/
    function formatTime(seconds) {
        let min = Math.floor(seconds / 60);
        let sec = Math.round(seconds % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    }

    /*** Spell List Calculation ***/
    /*** formulas from https://www.desmos.com/calculator/ubnnt6a52d ***/
    function calculateMagicRemaining(maxMagic, slope, offset) {
        let magicRemaining = maxMagic - Math.floor(maxMagic * slope + offset);
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
            { name: "Haggler's Charm", slope: 0.1, offset: 10, selected: true },
            { name: "Gambler's Fever Dream", slope: 0.05, offset: 3 },
        ];

        spells.forEach((spell) => {
            let magicRemaining = calculateMagicRemaining(maxMagic, spell.slope, spell.offset);
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
    }
    
    function startTimer() {
        if (countdown) clearInterval(countdown);
        const selectedTime = parseInt(elements.timeSelect.value);
        if (isNaN(selectedTime) || selectedTime <= 0) {
            elements.timer.textContent = "Invalid time selected";
            return;
        }
        startTime = performance.now();
        timerDurationSeconds = selectedTime;
        runCountdown();
    }

    function runCountdown() {
        countdown = setInterval(() => {
            let elapsed = (performance.now() - startTime) / 1000;
            let newTime = Math.max(0, timerDurationSeconds - elapsed);
            elements.timer.textContent = formatTime(Math.round(newTime));
            updateTabTitle(newTime);

            if (newTime <= 0) {
                clearInterval(countdown);
                elements.timer.textContent = "Time's Up!";
                playAlert();
                incrementPosition(); // Increment the position counter when timer completes
            }
        }, 1000);
    }

    function resetTimer() {
        if (countdown) clearInterval(countdown);
        stopAlert();
        elements.timer.textContent = "Select a spell to see time";
        
        // Reset the position highlight when resetting the timer
        elements.currentPositionInput.classList.remove("bg-danger", "text-white");
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
    }
    
    function toggleMute() {
        isMuted = !isMuted;
        
        // Set volume to 0 if muted, otherwise restore to slider value
        elements.alertSound.volume = isMuted ? 0 : currentVolume;
        
        // Update the volume icon
        updateVolumeIcon();
    }
    
    function updateVolumeIcon() {
        // Remove all existing path elements
        while (elements.volumeIcon.firstChild) {
            elements.volumeIcon.removeChild(elements.volumeIcon.firstChild);
        }
        
        // Create SVG paths based on current state
        if (isMuted) {
            // Muted icon
            createSVGPath(elements.volumeIcon, "M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z");
            createSVGPath(elements.volumeIcon, "M9.5 6.5a.5.5 0 0 1 .5.5v1.5a.5.5 0 0 1-1 0V7a.5.5 0 0 1 .5-.5z");
            createSVGPath(elements.volumeIcon, "M10.5 5.5a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5z");
            // Add the X
            createSVGPath(elements.volumeIcon, "M10.707 11.182A4.486 4.486 0 0 0 12.025 8a4.486 4.486 0 0 0-1.318-3.182L10 5.525A3.489 3.489 0 0 1 11.025 8c0 .966-.392 1.841-1.025 2.475l.707.707z");
            createSVGPath(elements.volumeIcon, "M12.5 2.134a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 1 0v-11a.5.5 0 0 0-.5-.5zm-7 1a.5.5 0 0 0-.5.5v6a.5.5 0 0 0 1 0v-6a.5.5 0 0 0-.5-.5z");
            createSVGPath(elements.volumeIcon, "M12.82 10.83l-1.32-1.32c-.293-.293-.768-.293-1.06 0s-.294.768 0 1.06l1.32 1.32c.292.294.767.294 1.06 0s.293-.768 0-1.06zm-1.06-4.78l1.32-1.32c.293-.292.293-.767 0-1.06-.292-.293-.767-.293-1.06 0l-1.32 1.32c-.293.293-.293.768 0 1.06.292.294.767.294 1.06 0z");
        } 
        else if (currentVolume === 0) {
            // Volume at zero but not muted
            createSVGPath(elements.volumeIcon, "M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z");
        }
        else if (currentVolume < 0.5) {
            // Low volume
            createSVGPath(elements.volumeIcon, "M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z");
            createSVGPath(elements.volumeIcon, "M8.707 11.182A4.486 4.486 0 0 0 10.025 8a4.486 4.486 0 0 0-1.318-3.182L8 5.525A3.489 3.489 0 0 1 9.025 8 3.49 3.49 0 0 1 8 10.475l.707.707z");
        } 
        else {
            // High volume
            createSVGPath(elements.volumeIcon, "M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z");
            createSVGPath(elements.volumeIcon, "M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.89l.706.706z");
            createSVGPath(elements.volumeIcon, "M10.025 8a4.486 4.486 0 0 1-1.318 3.182L8 10.475A3.489 3.489 0 0 0 9.025 8c0-.966-.392-1.841-1.025-2.475l.707-.707A4.486 4.486 0 0 1 10.025 8zM7 4a.5.5 0 0 0-.812-.39L3.825 5.5H1.5A.5.5 0 0 0 1 6v4a.5.5 0 0 0 .5.5h2.325l2.363 1.89A.5.5 0 0 0 7 12V4zM4.312 6.39 6 5.04v5.92L4.312 9.61A.5.5 0 0 0 4 9.5H2v-3h2a.5.5 0 0 0 .312-.11z");
        }
    }
    
    function createSVGPath(parent, d) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        parent.appendChild(path);
    }

    /*** FtHoF Queue Position Tracking ***/
    function updatePosition(value) {
        currentPosition = parseInt(value);
        if (isNaN(currentPosition)) currentPosition = 0;
        
        // Update the position display
        elements.currentPositionInput.value = currentPosition;
        
        // Check if we've reached the target
        checkTargetReached();
    }
    
    function incrementPosition() {
        currentPosition++;
        updatePosition(currentPosition);
    }
    
    function decrementPosition() {
        if (currentPosition > 0) {
            currentPosition--;
            updatePosition(currentPosition);
        }
    }
    
    function checkTargetReached() {
        const targetPosition = parseInt(elements.targetPositionInput.value);
        
        if (!isNaN(targetPosition) && currentPosition === targetPosition) {
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
    }

    /*** Initialize on Page Load ***/
    document.addEventListener("DOMContentLoaded", () => {
        // Cache DOM elements
        cacheElements();
        
        // Initialize app
        updateSpellList();
        
        // Initialize volume control
        elements.alertSound.volume = currentVolume;
        
        // Set initial value of volume slider
        if (elements.volumeControl) {
            elements.volumeControl.value = currentVolume;
        }
        
        // Initialize position tracking
        if (elements.currentPositionInput) {
            elements.currentPositionInput.value = currentPosition;
        }
    });

    return {
        updateSpellList,
        updateDisplayFromSelection,
        startTimer,
        resetTimer,
        stopAlert,
        updateVolume,
        toggleMute,
        updatePosition,
        incrementPosition,
        decrementPosition,
        checkTargetReached
    };
})();
