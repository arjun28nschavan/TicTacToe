let boxes = document.querySelectorAll(".box");//query sel for all will come for all boxes
let resetBtn = document.querySelector('#reset-btn');
let newGameBtn = document.querySelector('#new-btn');
let msgContainer = document.querySelector("#msgContainer");
let msg = document.querySelector('#msg');

let turnO = true;//playerX, playerO

// let arr [[]]  //2D array

const winPatterns = [//2D array -> all 8 patterns
    [0,1,2],
    [0,3,6],
    [0,4,8],
    [1,4,7],
    [2,5,8],
    [2,4,6],
    [3,4,5],
    [6,7,8]
];

const winnerModal = new bootstrap.Modal(document.getElementById("winnerModal"));

// Music
let bgMusic = document.querySelector("#bg-music");
let musicBtn = document.querySelector("#music-btn");
let musicPlaying = false;

// AI toggle and mode
let aiToggle = document.querySelector("#aiToggle");
let playVsAI = false; // default off
let aiIsX = false; // AI will play X (second player) when enabled

aiToggle.addEventListener("change", () => {
  playVsAI = aiToggle.checked;
  // if AI enabled and it's AI's turn (i.e., O already moved), trigger AI
  if (playVsAI) {
    // ensure proper turn: O starts (turnO = true). If user wants to play O, AI will be X.
    aiIsX = true; // medium AI plays X
    // if it's currently X's turn (turnO === false), let AI play
    if (!turnO) {
      aiMoveMedium();
    }
  } else {
    aiIsX = false;
  }
});

// Play/Stop music (user action required)
musicBtn.addEventListener("click", () => {
  if (musicPlaying) {
    bgMusic.pause();
    musicBtn.innerText = "🔊 Music";
  } else {
    // play returns a promise; handle rejection (autoplay policies)
    bgMusic.play().catch((e) => {
      // ignore, user may need to interact first; but we already are in click handler so should play
    });
    musicBtn.innerText = "🔉 Stop";
  }
  musicPlaying = !musicPlaying;
});

// Reset game fn
const resetGame = () => {
    turnO = true;
    enableBoxes();
    msgContainer.classList.add("hide");

    // remove winning glow
    boxes.forEach((box) => {
      box.classList.remove("win");
      box.style.textShadow = "";
    });

    // hide modal if visible
    try { winnerModal.hide(); } catch(e) {}
};

// boxes click logic
boxes.forEach((box, idx) => {//taking box element
    box.addEventListener("click" , () =>{
        // console.log("box was Clicked!");
        if(turnO){
            // for playerO
            box.innerText ='O';
            box.style.color = "#0ff";
            box.style.textShadow = "0 0 10px #0ff";
            turnO = false;
        }else{
            //for playerX
            box.innerText = 'X';
            box.style.color = "#ff0099";
            box.style.textShadow = "0 0 10px #ff0099";
            turnO = true;
        }
        box.disabled = true;//it stops button from getting double click

        // check winner after human move
        if (checkWinner()) return;

        // if AI is enabled, trigger AI move (AI plays X, medium)
        if (playVsAI) {
          // AI should act only when it's X's turn and AI is X
          if (!turnO && aiIsX) {
            // small delay to feel natural
            setTimeout(() => aiMoveMedium(), 300);
          } else if (turnO && !aiIsX) {
            // if AI were O (not used here), handle similarly
            setTimeout(() => aiMoveMedium(), 300);
          }
        }
    });
});

// disable boxes
const disableBoxes = () => {
    for(let box of boxes){
        box.disabled = true;
    }
};

// enable boxes
const enableBoxes = () => {
    for(let box of boxes){
        box.disabled = false;
        box.innerText = "";
        box.style.textShadow = "";
    }
};

// show winner (with confetti and modal)
const showWinner = (winner, pattern) => {
    msg.innerText = `🎉 Winner: ${winner} — HURRAY!`;
    msgContainer.classList.remove("hide");

    // winning line glow effect
    pattern.forEach((pos) => {
      boxes[pos].classList.add("win");
    });

    disableBoxes();

    // fire confetti (canvas-confetti)
    try {
      confetti({
        particleCount: 180,
        spread: 140,
        origin: { y: 0.4 }
      });
    } catch (e) {
      // confetti lib not loaded? ignore
    }

    // update modal text and show
    let winnerTextEl = document.getElementById("winnerText");
    if (winnerTextEl) {
      winnerTextEl.innerText = `🎉 Winner: ${winner} — HURRAY!`;
    }
    try { winnerModal.show(); } catch(e) {}
};

// check winner
const checkWinner = () =>{
    for(let pattern of winPatterns){
    let pos1Val = boxes[pattern[0]].innerText;
    let pos2Val = boxes[pattern[1]].innerText;
    let pos3Val = boxes[pattern[2]].innerText;

    if(pos1Val != "" && pos2Val != "" && pos3Val != ""){
        if(pos1Val === pos2Val && pos2Val === pos3Val){
            // console.log("winner is ",pos1Val);
            showWinner(pos1Val, pattern);
            return true;
        }
    }
  }

  // check draw: if all boxes filled and no winner
  let allFilled = true;
  for (let b of boxes) {
    if (b.innerText === "") { allFilled = false; break; }
  }
  if (allFilled) {
    msg.innerText = `It's a Draw!`;
    msgContainer.classList.remove("hide");
    // small confetti for draw (less)
    try {
      confetti({ particleCount: 80, spread: 80, origin: { y: 0.4 } });
    } catch (e) {}
    disableBoxes();
    try {
      let winnerTextEl = document.getElementById("winnerText");
      if (winnerTextEl) winnerTextEl.innerText = `It's a Draw!`;
      winnerModal.show();
    } catch(e){}
    return true;
  }

  return false;
};

// newGame and reset bindings
newGameBtn.addEventListener("click", resetGame);
resetBtn.addEventListener("click", resetGame);

/* -----------------------
   AI (Medium) Implementation
   Strategy (Medium):
   1) If AI can win this move, do it.
   2) Else if opponent can win next, block.
   3) Else take center if free.
   4) Else take a corner if free.
   5) Else take a random available cell.
   ----------------------- */

function aiMoveMedium() {
  // AI plays as 'X' (we set aiIsX = true).
  const aiMark = aiIsX ? 'X' : 'O';
  const humanMark = aiIsX ? 'O' : 'X';

  // helper: get empty indices
  const emptyIndices = () => {
    const arr = [];
    boxes.forEach((b, i) => { if (b.innerText === "") arr.push(i); });
    return arr;
  };

  // helper: try to find winning/blocking move for mark
  const findCriticalMove = (mark) => {
    for (let pattern of winPatterns) {
      let a = boxes[pattern[0]].innerText;
      let b = boxes[pattern[1]].innerText;
      let c = boxes[pattern[2]].innerText;

      // if two are mark and one empty, return empty index
      if (a === mark && b === mark && c === "") return pattern[2];
      if (a === mark && c === mark && b === "") return pattern[1];
      if (b === mark && c === mark && a === "") return pattern[0];
    }
    return -1;
  };

  // 1) AI win?
  let winIdx = findCriticalMove(aiMark);
  if (winIdx !== -1) {
    makeAIMoveAt(winIdx, aiMark);
    return;
  }

  // 2) Block human win?
  let blockIdx = findCriticalMove(humanMark);
  if (blockIdx !== -1) {
    makeAIMoveAt(blockIdx, aiMark);
    return;
  }

  // 3) Take center if free
  if (boxes[4].innerText === "") {
    makeAIMoveAt(4, aiMark);
    return;
  }

  // 4) Take a corner if free (prefer corners)
  const corners = [0,2,6,8];
  const freeCorners = corners.filter(i => boxes[i].innerText === "");
  if (freeCorners.length > 0) {
    const pick = freeCorners[Math.floor(Math.random()*freeCorners.length)];
    makeAIMoveAt(pick, aiMark);
    return;
  }

  // 5) Random available cell
  const empties = emptyIndices();
  if (empties.length > 0) {
    const pick = empties[Math.floor(Math.random()*empties.length)];
    makeAIMoveAt(pick, aiMark);
    return;
  }
}

// helper to place AI mark at index (simulate click)
function makeAIMoveAt(index, mark) {
  const box = boxes[index];
  if (!box || box.innerText !== "") return;

  // place mark visually
  box.innerText = mark;
  if (mark === 'X') {
    box.style.color = "#ff0099";
    box.style.textShadow = "0 0 10px #ff0099";
    turnO = true; // next is O
  } else {
    box.style.color = "#0ff";
    box.style.textShadow = "0 0 10px #0ff";
    turnO = false; // next is X
  }
  box.disabled = true;

  // after AI move, check winner
  checkWinner();
}
