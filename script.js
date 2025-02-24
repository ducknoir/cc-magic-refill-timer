const TimerApp = (function () {
    let countdown;
    let seconds = 0;
    let alarmInterval;
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
      stopAlarm();
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
          playAlarm();
        }
      }, 1000);
    }
  
    function updateDisplay() {
      let min = Math.floor(seconds / 60);
      let sec = seconds % 60;
      document.getElementById("timer").textContent = `${min}:${sec < 10 ? '0' : ''}${sec}`;
    }
  
    function playAlarm() {
      let soundMode = document.getElementById("soundMode").value;
      let audio = document.getElementById("alarmSound");
  
      if (soundMode === "once") {
        audio.play();
      } else if (soundMode === "repeat") {
        alarmInterval = setInterval(() => {
          audio.play();
        }, 3000); // Repeat every 3 seconds
      }
    }
  
    function stopAlarm() {
      let audio = document.getElementById("alarmSound");
      clearInterval(alarmInterval);
      audio.pause();
      audio.currentTime = 0;
    }
  
    return {
      updateDisplayFromSelection,
      startTimer,
      resetTimer,
      addTime,
      subtractTime,
      stopAlarm,
    };
  })();
  