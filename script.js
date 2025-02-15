// SHIFT DEFINITIONS
// - "8 AM - 3:30 PM"  => 7.5 hours
// - "3:30 PM - 11 PM"  => 7.5 hours
// - "11 AM - 11 PM"   => 12 hours
// - "8 AM - 11 PM"    => 15 hours
const shiftOptions = {
  halfEarly: "8 AM - 3:30 PM",  // 7.5 hours
  halfLate: "3:30 PM - 11 PM",  // 7.5 hours
  full: "11 AM - 11 PM",        // 12 hours
  long: "8 AM - 11 PM"          // 15 hours
};

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// We'll store chef objects here: { name, dayOff, weeklyHours, twoChefLong, twoChefFull }
let chefs = [];

// We now have 3 fixed chef inputs in index.html—no "Add Chef" button needed.

function generateRota() {
  console.log("Generating Rota...");

  // Reset and collect chef data; initialize two-chef assignment flags
  chefs = [];
  for (let i = 0; i < 3; i++) {
    let name = document.getElementById(`chef-name-${i}`).value.trim();
    let dayOff = document.getElementById(`day-off-${i}`).value;
    if (name) {
      chefs.push({ name, dayOff, weeklyHours: 0, twoChefLong: false, twoChefFull: false });
    }
  }

  if (chefs.length < 3) {
    alert("Please enter a name for all 3 chefs!");
    return;
  }

  console.log("Chefs List:", chefs);

  // Prepare empty rota structure
  let rota = {};
  days.forEach(day => {
    rota[day] = [];
  });

  // For each day, assign shifts
  days.forEach(day => {
    // Determine which chefs are available (i.e. not off)
    let availableChefs = chefs.filter(c => c.dayOff !== day);

    if (availableChefs.length === 3) {
      // When all 3 are available:
      // - One does 11 AM–11 PM (12 hours)
      // - One does 8 AM–3:30 PM (7.5 hours)
      // - One does 3:30 PM–11 PM (7.5 hours)
      availableChefs.sort((a, b) => a.weeklyHours - b.weeklyHours);

      // Give the chef with the fewest hours the 12-hour shift
      let chefFull = availableChefs[0];
      chefFull.weeklyHours += 12;
      rota[day].push({ name: chefFull.name, shift: shiftOptions.full });

      // The remaining two get the half shifts
      let chefEarly = availableChefs[1];
      chefEarly.weeklyHours += 7.5;
      rota[day].push({ name: chefEarly.name, shift: shiftOptions.halfEarly });

      let chefLate = availableChefs[2];
      chefLate.weeklyHours += 7.5;
      rota[day].push({ name: chefLate.name, shift: shiftOptions.halfLate });

    } else if (availableChefs.length === 2) {
      // When only 2 chefs are available (one chef is off)
      // We want to ensure that over the week, each chef gets exactly one
      // long shift (8 AM–11 PM, 15 hours) and one full shift (11 AM–11 PM, 12 hours)

      // Sort availableChefs as a tiebreaker
      availableChefs.sort((a, b) => a.weeklyHours - b.weeklyHours);
      let chef1 = availableChefs[0];
      let chef2 = availableChefs[1];

      // Determine what each chef still needs:
      let chef1NeedsLong = !chef1.twoChefLong;
      let chef1NeedsFull = !chef1.twoChefFull;
      let chef2NeedsLong = !chef2.twoChefLong;
      let chef2NeedsFull = !chef2.twoChefFull;

      // Ideally, one should get long and the other full.
      if (chef1NeedsLong && chef2NeedsFull) {
        chef1.twoChefLong = true;
        chef1.weeklyHours += 15;
        rota[day].push({ name: chef1.name, shift: shiftOptions.long });

        chef2.twoChefFull = true;
        chef2.weeklyHours += 12;
        rota[day].push({ name: chef2.name, shift: shiftOptions.full });
      } else if (chef2NeedsLong && chef1NeedsFull) {
        chef2.twoChefLong = true;
        chef2.weeklyHours += 15;
        rota[day].push({ name: chef2.name, shift: shiftOptions.long });

        chef1.twoChefFull = true;
        chef1.weeklyHours += 12;
        rota[day].push({ name: chef1.name, shift: shiftOptions.full });
      } else {
        // If both haven't received any assignment yet, use weekly hours as a tiebreaker.
        if (chef1.weeklyHours <= chef2.weeklyHours) {
          chef1.twoChefLong = true;
          chef1.weeklyHours += 15;
          rota[day].push({ name: chef1.name, shift: shiftOptions.long });

          chef2.twoChefFull = true;
          chef2.weeklyHours += 12;
          rota[day].push({ name: chef2.name, shift: shiftOptions.full });
        } else {
          chef2.twoChefLong = true;
          chef2.weeklyHours += 15;
          rota[day].push({ name: chef2.name, shift: shiftOptions.long });

          chef1.twoChefFull = true;
          chef1.weeklyHours += 12;
          rota[day].push({ name: chef1.name, shift: shiftOptions.full });
        }
      }
    } else {
      // If the number of available chefs is not 2 or 3, alert the user.
      alert(`Unexpected number of chefs available on ${day}: ${availableChefs.length}.
Please check the day-off selections.`);
      return;
    }
  });

  console.log("Generated Rota:", rota);
  displayRota(rota);
}

// Display the rota and weekly hours summary
function displayRota(rota) {
  let tableBody = document.querySelector("#rota-table tbody");
  tableBody.innerHTML = "";

  // One row per chef, one column per day
  chefs.forEach(chef => {
    let row = `<tr><td>${chef.name}</td>`;
    days.forEach(day => {
      let shiftObj = rota[day].find(entry => entry.name === chef.name);
      row += `<td>${shiftObj ? shiftObj.shift : "Off"}</td>`;
    });
    row += `</tr>`;
    tableBody.innerHTML += row;
  });

  // Display the weekly hours summary below the table
  let summaryDiv = document.getElementById("weekly-hours");
  if (!summaryDiv) {
    summaryDiv = document.createElement("div");
    summaryDiv.id = "weekly-hours";
    document.body.appendChild(summaryDiv);
  }
  let summaryHTML = "<h2>Weekly Hours Summary</h2><ul>";
  chefs.forEach(chef => {
    summaryHTML += `<li>${chef.name}: ${chef.weeklyHours} hours</li>`;
  });
  summaryHTML += "</ul>";
  summaryDiv.innerHTML = summaryHTML;
}

// NEW FUNCTION: Download the rota output as a PDF
function downloadRotaPDF() {
  // Select the element that contains the rota (the entire rota-output div)
  const rotaOutput = document.getElementById("rota-output");

  // Use html2canvas to capture the element as a canvas
  html2canvas(rotaOutput).then(function(canvas) {
    // Convert the canvas to an image
    const imgData = canvas.toDataURL('image/png');

    // Create a new jsPDF instance
    const pdf = new jspdf.jsPDF({
      orientation: 'landscape', // You may adjust orientation as needed
      unit: 'pt',
      format: 'a4'
    });

    // Calculate dimensions to maintain aspect ratio
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    // Add the captured image to the PDF
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

    // Trigger the download of the PDF
    pdf.save("rota.pdf");
  });
}
