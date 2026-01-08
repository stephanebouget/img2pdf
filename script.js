var doc;
var generatedFiles;
var filesToGen;
var imageQueue = [];
var loadedImages = []; // Store all loaded images for regeneration
var processingQueue = false;
window.jsPDF = window.jspdf.jsPDF;

window.addEventListener("load", function () {
  init();

  const fileSelector = document.getElementById("file-selector");
  const dropZone = document.getElementById("drop-zone");
  const browseLink = document.getElementById("browse-link");
  const keepRatioCheckbox = document.getElementById("keep-ratio");
  const compressPdfCheckbox = document.getElementById("compress-pdf");
  const imageQualitySlider = document.getElementById("image-quality");
  const qualityValue = document.getElementById("quality-value");
  const qualitySliderContainer = document.getElementById("quality-slider");

  // Browse link click
  browseLink.addEventListener("click", (e) => {
    e.stopPropagation();
    fileSelector.click();
  });

  // Drop zone click
  dropZone.addEventListener("click", () => {
    fileSelector.click();
  });

  // Drag and drop events
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    const files = e.dataTransfer.files;
    handleFiles(files);
  });

  fileSelector.addEventListener("change", (event) => {
    handleFiles(event.target.files);
  });

  // Regenerate PDF when checkbox changes
  keepRatioCheckbox.addEventListener("change", () => {
    updateImgWrapperClasses();
    if (loadedImages.length > 0) {
      regeneratePDF();
    }
  });
  
  // Toggle quality slider visibility
  compressPdfCheckbox.addEventListener("change", () => {
    qualitySliderContainer.style.display = compressPdfCheckbox.checked ? "block" : "none";
    if (loadedImages.length > 0) {
      regeneratePDF();
    }
  });
  
  // Update quality value display and regenerate PDF
  imageQualitySlider.addEventListener("input", () => {
    qualityValue.textContent = imageQualitySlider.value;
  });
  
  imageQualitySlider.addEventListener("change", () => {
    if (loadedImages.length > 0) {
      regeneratePDF();
    }
  });
});

function handleFiles(fileList) {
  console.log(fileList);
  const newFilesCount = fileList.length;
  filesToGen += newFilesCount;

  // Reset progress bar
  document.getElementById("progress-fill").style.width = "0%";
  document.getElementById("progress-text").textContent = "0%";
  document.getElementById("reset-btn").classList.remove("show");
  document.getElementById("dl-btn").classList.remove("show");
  document.getElementById("status-badge").classList.remove("show");

  // Show file item
  document.getElementById("file-item").classList.add("show");
  document.getElementById("file-count").textContent =
    filesToGen + " image" + (filesToGen > 1 ? "s" : "") + " selected";

  // Loop on files
  for (var i = 0; i < fileList.length; i++) {
    (function (file, i) {
      readImage(file, i);
    })(fileList[i], i);
  }
}

function updateProgress() {
  const progress =
    filesToGen > 0 ? Math.round((generatedFiles / filesToGen) * 100) : 0;
  document.getElementById("progress-fill").style.width = progress + "%";
  document.getElementById("progress-text").textContent = progress + "%";
}

function readImage(file, i) {
  console.log("file", file.type);

  // Check if the file is an image.
  if (file.type && !file.type.startsWith("image/")) {
    console.log("File is not an image.", file.type, file);
    return;
  } else {
    const reader = new FileReader();
    reader.onload = (event) => {
      // Load image to get dimensions
      const img = new Image();
      img.onload = function () {
        // Add to queue with all necessary data
        const imageData = {
          dataUrl: event.target.result,
          width: img.width,
          height: img.height,
        };
        imageQueue.push(imageData);
        loadedImages.push(imageData); // Store for regeneration

        addImg(event.target.result, loadedImages.length - 1);

        // Process queue if not already processing
        if (!processingQueue) {
          processImageQueue();
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
}

function processImageQueue() {
  if (imageQueue.length === 0) {
    processingQueue = false;
    return;
  }

  processingQueue = true;
  const imageData = imageQueue.shift();

  // Add new page if not the first image
  if (generatedFiles !== 0) {
    doc.addPage("a4", "portrait");
  }

  addImageToDoc(imageData);

  generatedFiles++;
  updateProgress();

  if (filesToGen === generatedFiles) {
    document.getElementById("reset-btn").classList.add("show");
    document.getElementById("dl-btn").classList.add("show");
    document.getElementById("status-badge").classList.add("show");
  }

  // Process next image in queue
  processImageQueue();
}

function addImageToDoc(imageData) {
  const keepRatio = document.getElementById("keep-ratio").checked;
  const compressPdf = document.getElementById("compress-pdf").checked;
  const pageWidth = 210;
  const pageHeight = 297;

  let imgWidth, imgHeight, x, y;

  if (keepRatio) {
    // Calculate dimensions keeping aspect ratio
    const imgRatio = imageData.width / imageData.height;
    const pageRatio = pageWidth / pageHeight;

    if (imgRatio > pageRatio) {
      // Image is wider than page ratio - fit to width
      imgWidth = pageWidth;
      imgHeight = pageWidth / imgRatio;
    } else {
      // Image is taller than page ratio - fit to height
      imgHeight = pageHeight;
      imgWidth = pageHeight * imgRatio;
    }

    // Center the image on the page
    x = (pageWidth - imgWidth) / 2;
    y = (pageHeight - imgHeight) / 2;
  } else {
    // Stretch to fill entire page
    imgWidth = pageWidth;
    imgHeight = pageHeight;
    x = 0;
    y = 0;
  }

  // Add image with compression if enabled
  let imageToAdd = imageData.dataUrl;
  if (compressPdf) {
    const quality = document.getElementById("image-quality").value / 100;
    imageToAdd = compressImage(imageData.dataUrl, quality);
  }

  doc.addImage(imageToAdd, "JPEG", x, y, imgWidth, imgHeight);
}

function compressImage(dataUrl, quality) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  
  // Set canvas to image size
  img.src = dataUrl;
  canvas.width = img.width;
  canvas.height = img.height;
  
  // Draw image on canvas
  ctx.drawImage(img, 0, 0);
  
  // Return compressed image as data URL
  return canvas.toDataURL('image/jpeg', quality);
}

function regeneratePDF() {
  // Create new PDF document
  doc = new jsPDF();

  // Re-add all images with current settings
  for (var i = 0; i < loadedImages.length; i++) {
    if (i !== 0) {
      doc.addPage("a4", "portrait");
    }
    addImageToDoc(loadedImages[i]);
  }
}

function download() {
  doc.save("images.pdf");
}

function init() {
  document.getElementById("file-selector").value = "";
  document.getElementById("imgs").innerHTML = "";
  document.getElementById("file-item").classList.remove("show");
  document.getElementById("reset-btn").classList.remove("show");
  document.getElementById("dl-btn").classList.remove("show");
  document.getElementById("status-badge").classList.remove("show");
  document.getElementById("progress-fill").style.width = "0%";
  document.getElementById("progress-text").textContent = "0%";
  doc = new jsPDF();
  generatedFiles = 0;
  filesToGen = 0;
  imageQueue = [];
  loadedImages = [];
  processingQueue = false;
}

function addImg(src, index) {
  var wrapper = document.createElement("div");
  wrapper.className = "img-wrapper";
  wrapper.draggable = true;
  wrapper.dataset.index = index;
  
  // Set initial class based on checkbox state
  const keepRatio = document.getElementById("keep-ratio").checked;
  wrapper.classList.add(keepRatio ? "keep-ratio" : "fullscreen");

  var indexBadge = document.createElement("span");
  indexBadge.className = "img-index";
  indexBadge.textContent = index + 1;

  var img = document.createElement("img");
  img.src = src;

  wrapper.appendChild(indexBadge);
  wrapper.appendChild(img);

  // Drag events for reordering
  wrapper.addEventListener("dragstart", handleDragStart);
  wrapper.addEventListener("dragend", handleDragEnd);
  wrapper.addEventListener("dragover", handleDragOver);
  wrapper.addEventListener("dragleave", handleDragLeave);
  wrapper.addEventListener("drop", handleDrop);

  var container = document.getElementById("imgs");
  container.appendChild(wrapper);
}

var draggedItem = null;
var draggedIndex = null;

function handleDragStart(e) {
  draggedItem = this;
  draggedIndex = parseInt(this.dataset.index);
  this.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
}

function handleDragEnd(e) {
  this.classList.remove("dragging");
  document.querySelectorAll(".img-wrapper").forEach((item) => {
    item.classList.remove("drag-over");
  });
  draggedItem = null;
  draggedIndex = null;
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  if (this !== draggedItem) {
    this.classList.add("drag-over");
  }
}

function handleDragLeave(e) {
  this.classList.remove("drag-over");
}

function handleDrop(e) {
  e.preventDefault();
  this.classList.remove("drag-over");

  if (this === draggedItem) return;

  var targetIndex = parseInt(this.dataset.index);

  // Reorder loadedImages array
  var movedImage = loadedImages.splice(draggedIndex, 1)[0];
  loadedImages.splice(targetIndex, 0, movedImage);

  // Rebuild the preview
  rebuildPreview();

  // Regenerate PDF
  regeneratePDF();
}

function rebuildPreview() {
  var container = document.getElementById("imgs");
  container.innerHTML = "";

  for (var i = 0; i < loadedImages.length; i++) {
    addImg(loadedImages[i].dataUrl, i);
  }
}

function updateIndexBadges() {
  var wrappers = document.querySelectorAll(".img-wrapper");
  wrappers.forEach((wrapper, index) => {
    wrapper.dataset.index = index;
    wrapper.querySelector(".img-index").textContent = index + 1;
  });
}

function updateImgWrapperClasses() {
  const keepRatio = document.getElementById("keep-ratio").checked;
  var wrappers = document.querySelectorAll(".img-wrapper");
  wrappers.forEach((wrapper) => {
    wrapper.classList.remove("keep-ratio", "fullscreen");
    wrapper.classList.add(keepRatio ? "keep-ratio" : "fullscreen");
  });
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./service-worker.js')
      .then(function(registration) {
        console.log('Service Worker registered successfully:', registration);
      })
      .catch(function(error) {
        console.log('Service Worker registration failed:', error);
      });
  });
}

// Handle install prompt
let deferredPrompt;
const installButton = document.getElementById('install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // Show install button if PWA can be installed
  if (installButton) {
    installButton.style.display = 'block';
  }
});

// Handle install button click
if (installButton) {
  installButton.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      deferredPrompt = null;
      installButton.style.display = 'none';
    }
  });
}

window.addEventListener('appinstalled', () => {
  console.log('PWA was installed');
  if (installButton) {
    installButton.style.display = 'none';
  }
});
