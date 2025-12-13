// Settings Window JavaScript

// DOM elements
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const thermalPrinter = document.getElementById('thermalPrinter');
const laserPrinter = document.getElementById('laserPrinter');
const testThermal = document.getElementById('testThermal');
const testLaser = document.getElementById('testLaser');
const jobsList = document.getElementById('jobsList');
const saveSettings = document.getElementById('saveSettings');
const viewLogs = document.getElementById('viewLogs');

// Initialize
async function initialize() {
  console.log('Settings window initializing...');

  // Load printers
  await loadPrinters();

  // Load settings
  await loadSettings();

  // Load recent jobs
  await loadRecentJobs();

  // Set up event listeners
  setupEventListeners();

  console.log('Settings window ready');
}

// Load available printers
async function loadPrinters() {
  try {
    const printers = await window.electronAPI.getPrinters();
    console.log('Printers loaded:', printers);

    // Populate thermal printer dropdown
    thermalPrinter.innerHTML = '<option value="">Select printer...</option>';
    printers.forEach(printer => {
      const option = document.createElement('option');
      option.value = printer.name;
      option.textContent = printer.name;
      thermalPrinter.appendChild(option);
    });

    // Populate laser printer dropdown
    laserPrinter.innerHTML = '<option value="">Select printer...</option>';
    printers.forEach(printer => {
      const option = document.createElement('option');
      option.value = printer.name;
      option.textContent = printer.name;
      laserPrinter.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to load printers:', error);
    thermalPrinter.innerHTML = '<option value="">Error loading printers</option>';
    laserPrinter.innerHTML = '<option value="">Error loading printers</option>';
  }
}

// Load saved settings
async function loadSettings() {
  try {
    const settings = await window.electronAPI.getSettings();
    console.log('Settings loaded:', settings);

    if (settings.thermalPrinter) {
      thermalPrinter.value = settings.thermalPrinter;
    }
    if (settings.laserPrinter) {
      laserPrinter.value = settings.laserPrinter;
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Load recent print jobs
async function loadRecentJobs() {
  try {
    const jobs = await window.electronAPI.getRecentJobs();
    console.log('Recent jobs loaded:', jobs);

    if (jobs.length === 0) {
      jobsList.innerHTML = '<p class="no-jobs">No recent jobs</p>';
      return;
    }

    jobsList.innerHTML = '';
    jobs.forEach(job => {
      const item = document.createElement('div');
      item.className = 'job-item';

      const statusIcon = job.status === 'completed' ? '✓' : '✗';
      const timeAgo = getTimeAgo(new Date(job.timestamp));

      item.innerHTML = `
        <span class="job-status">${statusIcon}</span>
        <div class="job-details">
          <div>Order #${job.orderNumber}</div>
          <div class="job-time">${timeAgo}</div>
        </div>
      `;

      jobsList.appendChild(item);
    });
  } catch (error) {
    console.error('Failed to load recent jobs:', error);
  }
}

// Set up event listeners
function setupEventListeners() {
  // Test thermal print
  testThermal.addEventListener('click', async () => {
    const printerName = thermalPrinter.value;
    if (!printerName) {
      alert('Please select a thermal printer first');
      return;
    }

    testThermal.disabled = true;
    testThermal.textContent = 'Printing...';

    try {
      await window.electronAPI.testPrint(printerName, 'thermal');
      alert('Test print sent successfully!');
    } catch (error) {
      alert('Test print failed: ' + error.message);
    } finally {
      testThermal.disabled = false;
      testThermal.textContent = 'Test Print';
    }
  });

  // Test laser print
  testLaser.addEventListener('click', async () => {
    const printerName = laserPrinter.value;
    if (!printerName) {
      alert('Please select a laser printer first');
      return;
    }

    testLaser.disabled = true;
    testLaser.textContent = 'Printing...';

    try {
      await window.electronAPI.testPrint(printerName, 'laser');
      alert('Test print sent successfully!');
    } catch (error) {
      alert('Test print failed: ' + error.message);
    } finally {
      testLaser.disabled = false;
      testLaser.textContent = 'Test Print';
    }
  });

  // Save settings
  saveSettings.addEventListener('click', async () => {
    const settings = {
      thermalPrinter: thermalPrinter.value,
      laserPrinter: laserPrinter.value
    };

    saveSettings.disabled = true;
    saveSettings.textContent = 'Saving...';

    try {
      await window.electronAPI.saveSettings(settings);
      alert('Settings saved successfully!');
    } catch (error) {
      alert('Failed to save settings: ' + error.message);
    } finally {
      saveSettings.disabled = false;
      saveSettings.textContent = 'Save Settings';
    }
  });

  // View logs
  viewLogs.addEventListener('click', () => {
    // TODO: Open log file location
    alert('Log viewer coming soon!');
  });

  // Listen for connection status updates
  window.electronAPI.onConnectionStatus((status) => {
    updateConnectionStatus(status);
  });

  // Listen for new print jobs
  window.electronAPI.onPrintJob((job) => {
    console.log('New print job:', job);
    loadRecentJobs(); // Refresh job list
  });
}

// Update connection status display
function updateConnectionStatus(status) {
  statusDot.className = 'status-dot';

  switch (status) {
    case 'connected':
      statusDot.classList.add('connected');
      statusText.textContent = 'Connected';
      break;
    case 'reconnecting':
      statusDot.classList.add('reconnecting');
      statusText.textContent = 'Reconnecting...';
      break;
    default:
      statusText.textContent = 'Disconnected';
  }
}

// Helper: Get time ago string
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + ' hour(s) ago';
  return Math.floor(seconds / 86400) + ' day(s) ago';
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
