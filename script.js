const TimerApp = (function () {
    const T = 500; // Number fo towers
    const L = 4; // Level of Grimoire
    let countdown;
    let seconds = 0;
    let alertInterval;
    let startTime;
    let remainingTime;
    let isMuted = false;
    let currentVolume = 1; // Default volume

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
        const maxMagic = parseInt(document.getElementById("customValue").value);
        if (isNaN(maxMagic) || maxMagic <= 0) {
            document.getElementById("timer").textContent = "Invalid Max Magic value";
            return;
        }

        const spellList = document.getElementById("timeSelect");
        spellList.innerHTML = "";

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
            spellList.appendChild(option);
        });

        updateDisplayFromSelection(); // Ensure display updates after list is refreshed
    }

    /*** Timer Controls ***/
    function updateDisplayFromSelection() {
        let spellList = document.getElementById("timeSelect");
        if (spellList.selectedIndex === -1) return; // No selection available
        seconds = parseInt(spellList.value);
        if (isNaN(seconds) || seconds <= 0) {
            document.getElementById("timer").textContent = "Invalid time selected";
            return;
        }
        document.getElementById("timer").textContent = formatTime(seconds);
        updateTabTitle(seconds);
    }

    function startTimer() {
        if (countdown) clearInterval(countdown);
        seconds = parseInt(document.getElementById("timeSelect").value);
        if (isNaN(seconds) || seconds <= 0) {
            document.getElementById("timer").textContent = "Invalid time selected";
            return;
        }
        startTime = performance.now();
        remainingTime = seconds;
        runCountdown();
    }

    function runCountdown() {
        countdown = setInterval(() => {
            let elapsed = (performance.now() - startTime) / 1000;
            let newTime = Math.max(0, remainingTime - elapsed);
            document.getElementById("timer").textContent = formatTime(Math.round(newTime));
            updateTabTitle(newTime);

            if (newTime <= 0) {
                clearInterval(countdown);
                document.getElementById("timer").textContent = "Time's Up!";
                playAlert();
            }
        }, 1000);
    }

    function resetTimer() {
        if (countdown) clearInterval(countdown);
        stopAlert();
        document.getElementById("timer").textContent = "Select a spell to see time";
    }

    /*** Alert System ***/
    function playAlert() {
        let alertMode = document.getElementById("alertMode").value;
        if (alertMode === "off") return;
        
        let audio = document.getElementById("alertSound");
        
        // Apply the current volume setting
        audio.volume = isMuted ? 0 : currentVolume;
        
        audio.play().catch(error => console.log("Playback prevented:", error));

        if (alertMode === "repeat") {
            alertInterval = setInterval(() => {
                audio.play().catch(error => console.log("Playback prevented:", error));
            }, 3000);
        }
    }

    function stopAlert() {
        let audio = document.getElementById("alertSound");
        clearInterval(alertInterval);
        audio.pause();
        audio.currentTime = 0;
    }

    function updateTabTitle(time) {
        document.title = time > 0 ? `⏳ ${formatTime(time)} - Magic Timer` : "Time's Up! ⏰";
    }
    
    /*** Volume Control System ***/
    function updateVolume(value) {
        currentVolume = parseFloat(value);
        let audio = document.getElementById("alertSound");
        
        // Update audio volume (if not muted)
        if (!isMuted) {
            audio.volume = currentVolume;
        }
        
        // Update volume icon based on current level
        updateVolumeIcon();
    }
    
    function toggleMute() {
        isMuted = !isMuted;
        let audio = document.getElementById("alertSound");
        
        // Set volume to 0 if muted, otherwise restore to slider value
        audio.volume = isMuted ? 0 : currentVolume;
        
        // Update the volume icon
        updateVolumeIcon();
    }
    
    function updateVolumeIcon() {
        const volumeIcon = document.getElementById("volumeIcon");
        
        // Remove all existing path elements
        while (volumeIcon.firstChild) {
            volumeIcon.removeChild(volumeIcon.firstChild);
        }
        
        // Create SVG paths based on current state
        if (isMuted) {
            // Muted icon
            createSVGPath(volumeIcon, "M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z");
            createSVGPath(volumeIcon, "M9.5 6.5a.5.5 0 0 1 .5.5v1.5a.5.5 0 0 1-1 0V7a.5.5 0 0 1 .5-.5z");
            createSVGPath(volumeIcon, "M10.5 5.5a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5z");
            // Add the X
            createSVGPath(volumeIcon, "M10.707 11.182A4.486 4.486 0 0 0 12.025 8a4.486 4.486 0 0 0-1.318-3.182L10 5.525A3.489 3.489 0 0 1 11.025 8c0 .966-.392 1.841-1.025 2.475l.707.707z");
            createSVGPath(volumeIcon, "M12.5 2.134a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 1 0v-11a.5.5 0 0 0-.5-.5zm-7 1a.5.5 0 0 0-.5.5v6a.5.5 0 0 0 1 0v-6a.5.5 0 0 0-.5-.5z");
            createSVGPath(volumeIcon, "M12.82 10.83l-1.32-1.32c-.293-.293-.768-.293-1.06 0s-.294.768 0 1.06l1.32 1.32c.292.294.767.294 1.06 0s.293-.768 0-1.06zm-1.06-4.78l1.32-1.32c.293-.292.293-.767 0-1.06-.292-.293-.767-.293-1.06 0l-1.32 1.32c-.293.293-.293.768 0 1.06.292.294.767.294 1.06 0z");
        } 
        else if (currentVolume === 0) {
            // Volume at zero but not muted
            createSVGPath(volumeIcon, "M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z");
        }
        else if (currentVolume < 0.5) {
            // Low volume
            createSVGPath(volumeIcon, "M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z");
            createSVGPath(volumeIcon, "M8.707 11.182A4.486 4.486 0 0 0 10.025 8a4.486 4.486 0 0 0-1.318-3.182L8 5.525A3.489 3.489 0 0 1 9.025 8 3.49 3.49 0 0 1 8 10.475l.707.707z");
        } 
        else {
            // High volume
            createSVGPath(volumeIcon, "M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z");
            createSVGPath(volumeIcon, "M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.89l.706.706z");
            createSVGPath(volumeIcon, "M10.025 8a4.486 4.486 0 0 1-1.318 3.182L8 10.475A3.489 3.489 0 0 0 9.025 8c0-.966-.392-1.841-1.025-2.475l.707-.707A4.486 4.486 0 0 1 10.025 8zM7 4a.5.5 0 0 0-.812-.39L3.825 5.5H1.5A.5.5 0 0 0 1 6v4a.5.5 0 0 0 .5.5h2.325l2.363 1.89A.5.5 0 0 0 7 12V4zM4.312 6.39 6 5.04v5.92L4.312 9.61A.5.5 0 0 0 4 9.5H2v-3h2a.5.5 0 0 0 .312-.11z");
        }
    }
    
    function createSVGPath(parent, d) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        parent.appendChild(path);
    }

    /*** Initialize Spell List on Page Load ***/
    document.addEventListener("DOMContentLoaded", () => {
        updateSpellList();
        
        // Initialize volume control
        const audio = document.getElementById("alertSound");
        audio.volume = currentVolume;
        
        // Set initial value of volume slider
        const volumeControl = document.getElementById("volumeControl");
        if (volumeControl) {
            volumeControl.value = currentVolume;
        }
    });

    return {
        updateSpellList,
        updateDisplayFromSelection,
        startTimer,
        resetTimer,
        stopAlert,
        updateVolume,
        toggleMute
    };
})();
