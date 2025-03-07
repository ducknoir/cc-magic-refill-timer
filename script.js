const TimerApp = (function () {
    const T = 500; // Number fo towers
    const L = 4; // Level of Grimoire
    let countdown;
    let seconds = 0;
    let alertInterval;
    let startTime;
    let remainingTime;

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
            { name: "Haggler's Charm", slope: 0.1, offset: 10 },
            { name: "Gambler's Fever Dream", slope: 0.05, offset: 3 },
        ];

        spells.forEach((spell) => {
            let magicRemaining = calculateMagicRemaining(maxMagic, spell.slope, spell.offset);
            let timeSeconds = calculateTimeSeconds(maxMagic, magicRemaining);
            let option = document.createElement("option");
            option.value = timeSeconds;
            option.textContent = `${formatTime(timeSeconds)} - ${spell.name} (${Math.round(magicRemaining)})`;
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
        let audio = document.getElementById("alertSound");

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

    /*** Initialize Spell List on Page Load ***/
    document.addEventListener("DOMContentLoaded", () => {
        updateSpellList();
    });

    return {
        updateSpellList,
        updateDisplayFromSelection,
        startTimer,
        resetTimer,
        stopAlert
    };
})();
