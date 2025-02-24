const TimerApp = (function () {
    let countdown;
    let seconds = 0;
    let alertInterval;
    let startTime;
    let remainingTime;
  
    function updateDisplayFromSelection() {
      seconds = parseInt(document.getElementById("timeSelect").value);
      updateDisplay();
    }
  
    function startTimer() {
      if (countdown) clearInterval(countdown);
      seconds = parseInt(document.getElementById("timeSelect").value);
      startTime = performance.now();
      remainingTime = seconds;
      runCountdown();
    }
  
    function resetTimer() {
      if (countdown) clearInterval(countdown);
      stopAlert();
      document.getElementById("timer").textContent = "Select a spell to see time";
    }
  
    function addTime(amount) {
      remainingTime += amount;
      updateDisplay();
    }
  
    function subtractTime(amount) {
      remainingTime = Math.max(0, remainingTime - amount);
      updateDisplay();
    }
  
    function runCountdown() {
      countdown = setInterval(() => {
        let elapsed = (performance.now() - startTime) / 1000;
        let newTime = Math.max(0, remainingTime - elapsed);
  
        if (newTime > 0) {
          seconds = Math.round(newTime);
          updateDisplay();
        } else {
          clearInterval(countdown);
          document.getElementById("timer").textContent = "Time's Up!";
          playAlert();
        }
      }, 1000);
    }
  
    function updateDisplay() {
      let min = Math.floor(seconds / 60);
      let sec = seconds % 60;
      document.getElementById("timer").textContent = `${min}:${sec < 10 ? '0' : ''}${sec}`;
    }
  
    function playAlert() {
        let alertMode = document.getElementById("alertMode").value;
        let audio = document.getElementById("alertSound");
      
        // Ensure the sound is loaded before playing
        audio.load();
        audio.play().catch(error => console.log("Playback prevented:", error));
      
        if (alertMode === "repeat") {
          alertInterval = setInterval(() => {
            audio.play().catch(error => console.log("Playback prevented:", error));
          }, 3000); // Repeat every 3 seconds
        }
      }

      function stopAlert() {
      let audio = document.getElementById("alertSound");
      clearInterval(alertInterval);
      audio.pause();
      audio.currentTime = 0;
    }
  
    return {
      updateDisplayFromSelection,
      startTimer,
      resetTimer,
      addTime,
      subtractTime,
      stopAlert,
    };
  })();
  