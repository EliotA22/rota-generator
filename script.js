// script.js

// -------------------------------
// SHIFT DEFINITIONS & HOURS
// -------------------------------

// Standard day shifts
const standardShifts = {
  morning: "8:00 AM - 5:00 PM",      // (Not used in 2-chef scenario)
  evening: "5:00 PM - 11:00 PM",       // (Not used in 2-chef scenario)
  full: "11:00 AM - 11:00 PM",         // 12 hours
  combined: "8:00 AM - 11:00 PM"       // 15 hours
};

const standardShiftHours = {
  "8:00 AM - 11:00 PM": 15,
  "11:00 AM - 11:00 PM": 12
};

// Weekend (Friday & Saturday) shifts
const weekendShifts = {
  morning: "8:00 AM - 5:00 PM",        // (Not used in 2-chef scenario)
  evening: "5:00 PM - 2:00 AM",          // 9 hours
  full: "11:00 AM - 2:00 AM",            // 15 hours
  combined: "8:00 AM - 2:00 AM"          // 18 hours
};

const weekendShiftHours = {
  "8:00 AM - 2:00 AM": 18,
  "11:00 AM - 2:00 AM": 15
};

// For other shifts (when 3 chefs are available, etc.), we still use these defaults:
const shiftOptions = {
  halfEarly: "8:00 AM - 5:00 PM",   // 9 hours (used for 3-chef assignment)
  halfLate: "5:00 PM - 11:00 PM",    // 6 hours (used for 3-chef assignment)
  full: standardShifts.full,        // "11:00 AM - 11:00 PM"
  long: standardShifts.combined     // "8:00 AM - 11:00 PM" for standard days (if needed)
};

const shiftHours = {
  "8:00 AM - 5:00 PM": 9,
  "5:00 PM - 11:00 PM": 6,
  "11:00 AM - 11:00 PM": 12.5,
  "8:00 AM - 11:00 PM": 15
};

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// -------------------------------
// GLOBAL VARIABLES
// -------------------------------
let chefs = []; // Array to hold chef objects
let rota = {};  // Object to hold the schedule (rota)

// ----------------------------------------------------
// TIME PARSING & 12-HOUR FORMAT FUNCTIONS
// ----------------------------------------------------
function parseTime(timeString) {
  let parts = timeString.split(":");
  if (parts.length !== 2) return null;
  let hours = parseInt(parts[0], 10);
  let minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function calculateDuration(startTime, endTime) {
  let start = parseTime(startTime);
  let end = parseTime(endTime);
  if (start === null || end === null) return 0;
  let diff = end - start;
  if (diff < 0) diff += 24 * 60;
  return diff / 60;
}

function parseTime12(timeStr) {
  let [hhmm, meridiem] = timeStr.trim().split(" ");
  if (!hhmm.includes(":")) { hhmm = hhmm + ":00"; }
  let [hh, mm] = hhmm.split(":");
  let hours = parseInt(hh, 10);
  let minutes = parseInt(mm, 10);
  meridiem = meridiem ? meridiem.toUpperCase() : "";
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function formatTime12(totalMinutes) {
  totalMinutes = totalMinutes % (24 * 60);
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  let hours24 = Math.floor(totalMinutes / 60);
  let minutes = totalMinutes % 60;
  let meridiem = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  let mmStr = minutes < 10 ? "0" + minutes : minutes.toString();
  return `${hours12}:${mmStr} ${meridiem}`;
}

function unifyShiftFormat(shiftString) {
  if (!shiftString || shiftString.toLowerCase() === "off") return "Off";
  let parts = shiftString.split("-");
  if (parts.length !== 2) return shiftString;
  let startStr = parts[0].trim();
  let endStr = parts[1].trim();
  let startMins = parseTime12(startStr);
  let endMins = parseTime12(endStr);
  if (startMins === null || endMins === null) return shiftString;
  let newStart = formatTime12(startMins);
  let newEnd = formatTime12(endMins);
  return `${newStart} - ${newEnd}`;
}

// ----------------------------------------------------
// HELPER FUNCTION: mergeShifts (unchanged except for using new shift strings)
// ----------------------------------------------------
function mergeShifts(shift1, shift2) {
  // For standard days, if one shift is morning and the other evening, merge to combined.
  if (
    (shift1 === standardShifts.morning && shift2 === standardShifts.evening) ||
    (shift1 === standardShifts.evening && shift2 === standardShifts.morning)
  ) {
    return standardShifts.combined;
  }
  // For weekend days, similarly:
  if (
    (shift1 === weekendShifts.morning && shift2 === weekendShifts.evening) ||
    (shift1 === weekendShifts.evening && shift2 === weekendShifts.morning)
  ) {
    return weekendShifts.combined;
  }
  // Merging full and half:
  if (
    (shift1 === standardShifts.full && (shift2 === standardShifts.morning || shift2 === standardShifts.evening)) ||
    ((shift1 === standardShifts.morning || shift1 === standardShifts.evening) && shift2 === standardShifts.full)
  ) {
    return standardShifts.combined;
  }
  if (
    (shift1 === weekendShifts.full && (shift2 === weekendShifts.morning || shift2 === weekendShifts.evening)) ||
    ((shift1 === weekendShifts.morning || shift1 === weekendShifts.evening) && shift2 === weekendShifts.full)
  ) {
    return weekendShifts.combined;
  }
  // Merging two full shifts:
  if (shift1 === standardShifts.full && shift2 === standardShifts.full) {
    return standardShifts.combined;
  }
  if (shift1 === weekendShifts.full && shift2 === weekendShifts.full) {
    return weekendShifts.combined;
  }
  // If either is already combined, result is combined.
  if (shift1 === standardShifts.combined || shift2 === standardShifts.combined) {
    return standardShifts.combined;
  }
  if (shift1 === weekendShifts.combined || shift2 === weekendShifts.combined) {
    return weekendShifts.combined;
  }
  return null;
}

// ----------------------------------------------------
// MODAL MANAGEMENT FUNCTIONS (unchanged)
// ----------------------------------------------------
function closeModal() {
  let modal = document.getElementById("edit-modal");
  if (modal) modal.remove();
}

function createModal(contentHTML) {
  closeModal();
  let modal = document.createElement("div");
  modal.id = "edit-modal";
  modal.style.position = "fixed";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100%";
  modal.style.height = "100%";
  modal.style.backgroundColor = "rgba(0,0,0,0.5)";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.innerHTML = `<div class="modal-content" style="background: white; padding: 20px; border-radius: 8px; min-width: 300px;">
    ${contentHTML}
  </div>`;
  document.body.appendChild(modal);
  return modal;
}

// ----------------------------------------------------
// MODAL: EDIT OPTIONS (Replace, Edit Times, Delete, Cancel)
// ----------------------------------------------------
function openEditOptionsModal(day, currentChef, currentShift, cell) {
  const modalHTML = `
    <h2>Modify Shift for ${day} (${currentChef} - ${currentShift})</h2>
    <label for="new-chef-input">Replace with Chef:</label>
    <input type="text" id="new-chef-input" placeholder="Enter new chef name">
    <br><br>
    <button id="replace-btn">Replace</button>
    <button id="edit-btn">Edit Shift Times</button>
    <button id="delete-btn">Delete Shift</button>
    <button id="cancel-btn">Cancel</button>
  `;
  const modal = createModal(modalHTML);
  document.getElementById("cancel-btn").addEventListener("click", closeModal);
  document.getElementById("delete-btn").addEventListener("click", function() {
    rota[day] = rota[day].filter(a => !(a.name === currentChef && a.shift === currentShift));
    recalcWeeklyHours();
    displayRota();
    closeModal();
  });
  document.getElementById("replace-btn").addEventListener("click", function() {
    const newChef = document.getElementById("new-chef-input").value.trim();
    if (!newChef || newChef === currentChef) {
      alert("Please enter a valid replacement chef name.");
      return;
    }
    let availableNames = chefs.map(c => c.name).filter(name => name !== currentChef);
    if (!availableNames.includes(newChef)) {
      alert("Invalid chef name entered.");
      return;
    }
    let existingAssignment = rota[day].find(a => a.name === newChef);
    if (existingAssignment) {
      let merged = mergeShifts(existingAssignment.shift, currentShift);
      if (merged) {
        rota[day] = rota[day].filter(a => !(a.name === currentChef && a.shift === currentShift));
        existingAssignment.shift = merged;
        recalcWeeklyHours();
        displayRota();
        closeModal();
        return;
      } else {
        alert(`${newChef} already has a conflicting shift on ${day} that cannot be merged.`);
        return;
      }
    }
    let assignment = rota[day].find(a => a.name === currentChef && a.shift === currentShift);
    if (assignment) {
      rota[day] = rota[day].filter(a => !(a.name === currentChef && a.shift === currentShift));
      rota[day].push({ name: newChef, shift: currentShift });
      recalcWeeklyHours();
      displayRota();
      closeModal();
    }
  });
  document.getElementById("edit-btn").addEventListener("click", function() {
    closeModal();
    openTimeEditModal(day, currentChef, currentShift, cell);
  });
}

// ----------------------------------------------------
// MODAL: TIME EDIT (for editing shift times)
// ----------------------------------------------------
function openTimeEditModal(day, currentChef, currentShift, cell) {
  let titleText = currentShift ?
      `Edit Shift Times for ${currentChef} on ${day}` :
      `Enter Shift Times for ${cell.getAttribute("data-current-chef")} on ${day}`;
  const modalHTML = `
    <h2>${titleText}</h2>
    <label for="start-time-input">Start Time (hh:mm):</label>
    <input type="text" id="start-time-input" placeholder="hh:mm">
    <select id="start-meridiem">
      <option value="AM">AM</option>
      <option value="PM">PM</option>
    </select>
    <br><br>
    <label for="end-time-input">End Time (hh:mm):</label>
    <input type="text" id="end-time-input" placeholder="hh:mm">
    <select id="end-meridiem">
      <option value="AM">AM</option>
      <option value="PM">PM</option>
    </select>
    <br><br>
    <button id="submit-time-btn">Submit</button>
    <button id="cancel-btn">Cancel</button>
  `;
  const modal = createModal(modalHTML);
  document.getElementById("cancel-btn").addEventListener("click", closeModal);
  document.getElementById("submit-time-btn").addEventListener("click", function() {
    let startTime = document.getElementById("start-time-input").value.trim();
    let startMeridiem = document.getElementById("start-meridiem").value;
    let endTime = document.getElementById("end-time-input").value.trim();
    let endMeridiem = document.getElementById("end-meridiem").value;
    if (!startTime || !endTime) {
      alert("Please enter both start and end times.");
      return;
    }
    let newStart = `${startTime} ${startMeridiem}`;
    let newEnd = `${endTime} ${endMeridiem}`;
    function convertTo24(timeStr) {
      let parts = timeStr.split(" ");
      if (parts.length !== 2) return null;
      let [hhmm, mer] = parts;
      let [hh, mm] = hhmm.split(":");
      let hours = parseInt(hh, 10);
      let mins = parseInt(mm, 10);
      mer = mer.toUpperCase();
      if (mer === "PM" && hours < 12) hours += 12;
      if (mer === "AM" && hours === 12) hours = 0;
      return `${hours < 10 ? "0" + hours : hours}:${mins < 10 ? "0" + mins : mins}`;
    }
    let convStart = convertTo24(newStart);
    let convEnd = convertTo24(newEnd);
    if (!convStart || !convEnd) {
      alert("Invalid time format entered.");
      return;
    }
    let newDuration = calculateDuration(convStart, convEnd);
    if (newDuration <= 0) {
      alert("Invalid shift times entered.");
      return;
    }
    let newShift = `${newStart} - ${newEnd}`;
    if (currentShift) {
      let assignment = rota[day].find(a => a.name === currentChef && a.shift === currentShift);
      if (assignment) {
        assignment.shift = newShift;
        assignment.duration = newDuration;
      }
    } else {
      let chefName = cell.getAttribute("data-current-chef");
      rota[day].push({ name: chefName, shift: newShift, duration: newDuration });
    }
    recalcWeeklyHours();
    displayRota();
    closeModal();
  });
}

// -------------------------------
// CELL CLICK HANDLER: Open Modal
// -------------------------------
function openModal(cell) {
  let day = cell.getAttribute("data-day");
  let currentChef = cell.getAttribute("data-current-chef");
  let currentShift = cell.getAttribute("data-shift");
  if (cell.innerText === "Off") {
    openTimeEditModal(day, currentChef, null, cell);
  } else {
    openEditOptionsModal(day, currentChef, currentShift, cell);
  }
}

// -------------------------------
// Attach Click Event to Table Cells
// -------------------------------
function addCellEditListeners() {
  let cells = document.querySelectorAll("#rota-table tbody td");
  cells.forEach(cell => {
    cell.style.cursor = "pointer";
    cell.addEventListener("click", function() {
      openModal(cell);
    });
  });
}

// -------------------------------
// WEEKLY HOURS CALCULATION & DISPLAY
// -------------------------------
function recalcWeeklyHours() {
  chefs.forEach(chef => { chef.weeklyHours = 0; });
  days.forEach(day => {
    if (rota[day]) {
      rota[day].forEach(assignment => {
        let hours = assignment.duration ? assignment.duration : (function() {
          let shifts = (day === "Friday" || day === "Saturday") ? weekendShiftHours : standardShiftHours;
          return shifts[assignment.shift] || 0;
        })();
        let chef = chefs.find(c => c.name === assignment.name);
        if (chef) {
          chef.weeklyHours += hours;
        }
      });
    }
  });
}

function updateWeeklyHoursDisplay() {
  let summaryDiv = document.getElementById("weekly-hours");
  let summaryHTML = "<h2>Weekly Hours Summary</h2><ul>";
  chefs.forEach(chef => {
    summaryHTML += `<li>${chef.name}: ${chef.weeklyHours} hours</li>`;
  });
  summaryHTML += "</ul>";
  summaryDiv.innerHTML = summaryHTML;
}

// -------------------------------
// ROTA GENERATION & DISPLAY FUNCTIONS
// -------------------------------
function generateRota() {
  console.log("Generating Rota...");
  chefs = [];
  rota = {};
  for (let i = 0; i < 3; i++) {
    let name = document.getElementById(`chef-name-${i}`).value.trim();
    let dayOffSelect = document.getElementById(`day-off-${i}`);
    let selectedDays = Array.from(dayOffSelect.selectedOptions).map(opt => opt.value);
    if (name) {
      chefs.push({
        name,
        daysOff: selectedDays,
        weeklyHours: 0
      });
    }
  }
  if (chefs.length < 3) {
    alert("Please enter a name for all 3 chefs!");
    return;
  }
  console.log("Chefs List:", chefs);
  days.forEach(day => { rota[day] = []; });
  days.forEach(day => {
    let availableChefs = chefs.filter(c => !c.daysOff.includes(day));
    let shifts, hoursObj;
    if (day === "Friday" || day === "Saturday") {
      shifts = weekendShifts;
      hoursObj = weekendShiftHours;
    } else {
      shifts = standardShifts;
      hoursObj = standardShiftHours;
    }
    if (availableChefs.length === 3) {
      availableChefs.sort((a, b) => a.weeklyHours - b.weeklyHours);
      // When all 3 chefs are available, assign:
      // - Full shift: standardShifts.full ("11:00 AM - 11:00 PM") on standard days,
      //   or weekendShifts.full ("11:00 AM - 2:00 AM") on Friday/Saturday.
      let chefFull = availableChefs[0];
      chefFull.weeklyHours += hoursObj[shifts.full];
      rota[day].push({ name: chefFull.name, shift: shifts.full });
      // - Morning shift on standard days or morning shift on weekend remains same:
      //   For standard days: "8:00 AM - 5:00 PM"
      //   For weekends, we could use "8:00 AM - 5:00 PM" as well (if needed) but here we'll assume 3-chef scenario uses default shifts.
      let chefMorning = availableChefs[1];
      chefMorning.weeklyHours += shiftHours[shiftOptions.halfEarly]; // Using previously defined halfEarly for display
      rota[day].push({ name: chefMorning.name, shift: shiftOptions.halfEarly });
      let chefEvening = availableChefs[2];
      chefEvening.weeklyHours += shiftHours[shiftOptions.halfLate];
      rota[day].push({ name: chefEvening.name, shift: shiftOptions.halfLate });
    } else if (availableChefs.length === 2) {
      availableChefs.sort((a, b) => a.weeklyHours - b.weeklyHours);
      if (day === "Friday" || day === "Saturday") {
        // For Fridays and Saturdays:
        // - Combined shift: "8:00 AM - 2:00 AM" (18 hours)
        let chefCombined = availableChefs[0];
        chefCombined.weeklyHours += hoursObj["8:00 AM - 2:00 AM"];
        rota[day].push({ name: chefCombined.name, shift: "8:00 AM - 2:00 AM" });
        // - Full shift: "11:00 AM - 2:00 AM" (15 hours)
        let chefFull = availableChefs[1];
        chefFull.weeklyHours += hoursObj["11:00 AM - 2:00 AM"];
        rota[day].push({ name: chefFull.name, shift: "11:00 AM - 2:00 AM" });
      } else {
        // For standard days:
        // - Combined shift: "8:00 AM - 11:00 PM" (15 hours)
        let chefCombined = availableChefs[0];
        chefCombined.weeklyHours += hoursObj["8:00 AM - 11:00 PM"];
        rota[day].push({ name: chefCombined.name, shift: "8:00 AM - 11:00 PM" });
        // - Full shift: "11:00 AM - 11:00 PM" (12 hours)
        let chefFull = availableChefs[1];
        chefFull.weeklyHours += hoursObj["11:00 AM - 11:00 PM"];
        rota[day].push({ name: chefFull.name, shift: "11:00 AM - 11:00 PM" });
      }
    } else if (availableChefs.length === 1) {
      let chefOnly = availableChefs[0];
      chefOnly.weeklyHours += hoursObj[shifts.combined];
      rota[day].push({ name: chefOnly.name, shift: shifts.combined });
    }
  });
  console.log("Generated Rota:", rota);
  displayRota();
}

function displayRota() {
  let tableBody = document.querySelector("#rota-table tbody");
  tableBody.innerHTML = "";
  chefs.forEach(chef => {
    let row = `<tr><td>${chef.name}</td>`;
    days.forEach(day => {
      let assignment = rota[day].find(a => a.name === chef.name);
      let cellText = assignment ? unifyShiftFormat(assignment.shift) : "Off";
      row += `<td data-day="${day}" data-current-chef="${chef.name}" data-shift="${assignment ? assignment.shift : ''}">${cellText}</td>`;
    });
    row += "</tr>";
    tableBody.innerHTML += row;
  });
  addCellEditListeners();
  updateWeeklyHoursDisplay();
}

// -------------------------------
// PDF DOWNLOAD FUNCTION
// -------------------------------
function downloadRotaPDF() {
  const rotaOutput = document.getElementById("rota-output");
  html2canvas(rotaOutput).then(function(canvas) {
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jspdf.jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4'
    });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save("rota.pdf");
  });
}
