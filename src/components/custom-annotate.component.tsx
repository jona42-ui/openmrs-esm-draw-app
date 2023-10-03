import React, { useEffect, useRef, useState } from "react";
import { fabric } from "fabric";
import "./custom-annotate.scss"; // Import your CSS file for styling
import { showToast } from "@openmrs/esm-framework";
import { Button, FileUploader, Modal, TextInput, Header } from "@carbon/react";
import {
  ShapeExclude,
  CircleStroke,
  Draw,
  WatsonHealthTextAnnotationToggle,
  Undo,
  Redo,
  ColorPalette,
} from "@carbon/react/icons"; // Import the icons you want to use
import { createAttachment } from "../attachments/attachments.resource";
import { readFileAsString } from "../utils";

const SvgEditor = () => {
  const canvasRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [drawingMode, setDrawingMode] = useState("rectangle");
  const [stateHistory, setStateHistory] = useState([]);
  const [currentStatePointer, setCurrentStatePointer] = useState(-1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });
  const [imageObject, setImageObject] = useState(null);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [attachmentName, setAttachmentName] = useState(""); // State to store attachment name
  const [originalImage, setOriginalImage] = useState(null); // State to store the original image object

  const colorPickerRef = useRef(null);

  useEffect(() => {
    const options = {
      width: window.innerWidth, // Set canvas width to window width
      height: window.innerHeight, // Set canvas height to window height
    };
    const newCanvas = new fabric.Canvas(canvasRef.current, options);
    setCanvas(newCanvas);

    newCanvas.on("mouse:down", handleMouseDown);
    newCanvas.on("mouse:move", handleMouseMove);
    newCanvas.on("mouse:up", handleMouseUp);

    // Clear the state history when the canvas is first created
    setStateHistory([JSON.stringify(newCanvas)]);
    setCurrentStatePointer(0);

    return () => {
      newCanvas.dispose();
    };
  }, []);

  const selectDrawingMode = (mode) => {
    setDrawingMode(mode);
    canvas.isDrawingMode = mode === "freehand";
  };

  const addShape = () => {
    let shape;
    if (drawingMode === "rectangle") {
      shape = new fabric.Rect({
        width: 100,
        height: 50,
        fill: "transparent",
        stroke: "blue",
        strokeWidth: 2,
        left: 100,
        top: 100,
      });
    } else if (drawingMode === "circle") {
      shape = new fabric.Circle({
        radius: 25,
        fill: "transparent",
        stroke: "red",
        strokeWidth: 2,
        left: 200,
        top: 200,
      });
    }
    if (shape) {
      canvas.add(shape);
      // Ensure the shape is always at the front
      shape.bringToFront();
      saveCanvasState();
    }
  };

  const addText = () => {
    const text = new fabric.IText("Type your text here", {
      left: 300,
      top: 300,
      fill: "black",
    });
    canvas.add(text);
    // Ensure the text is always at the front
    text.bringToFront();
    saveCanvasState();
  };

  const changeColor = (color) => {
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      activeObject.set({ fill: color });
      canvas.renderAll();
      saveCanvasState();
    }
  };

  const handleMouseDown = (event) => {
    if (drawingMode === "freehand") {
      setIsDrawing(true);
      const { offsetX, offsetY } = event.e;
      setLastPosition({ x: offsetX, y: offsetY });
    }
  };

  const handleMouseMove = (event) => {
    if (isDrawing) {
      const { offsetX, offsetY } = event.e;
      const path = new fabric.Path(
        `M ${lastPosition.x} ${lastPosition.y} L ${offsetX} ${offsetY}`,
        {
          stroke: "blue",
          strokeWidth: 2,
          fill: "transparent",
        }
      );
      canvas.add(path);
      setLastPosition({ x: offsetX, y: offsetY });
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    saveCanvasState();
  };

  const saveCanvasState = () => {
    // Only save canvas state if the canvas is defined
    if (canvas) {
      const canvasState = JSON.stringify(canvas);
      const newHistory = [
        ...stateHistory.slice(0, currentStatePointer + 1),
        canvasState,
      ];
      setStateHistory(newHistory);
      setCurrentStatePointer(newHistory.length - 1);
    }
  };

  const undo = () => {
    if (currentStatePointer > 0) {
      const newPointer = currentStatePointer - 1;
      const canvasState = stateHistory[newPointer];
      setCurrentStatePointer(newPointer);
      canvas.loadFromJSON(canvasState, () => {
        canvas.renderAll();
      });
    }
  };

  const redo = () => {
    if (currentStatePointer < stateHistory.length - 1) {
      const newPointer = currentStatePointer + 1;
      const canvasState = stateHistory[newPointer];
      setCurrentStatePointer(newPointer);
      canvas.loadFromJSON(canvasState, () => {
        canvas.renderAll();
      });
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        // Remove the original image if it exists
        if (originalImage) {
          canvas.remove(originalImage);
        }
        // Load the image and add it to the canvas
        fabric.Image.fromURL(e.target.result, (img) => {
          // Center the image on the canvas
          img.set({
            left: canvas.width / 2,
            top: canvas.height / 2,
            draggable: true,
          });

          // Add the image to the canvas
          canvas.add(img);
          setOriginalImage(img);

          // Bring the image to the front of the stacking order
          img.bringToFront();
          // Set the imageObject state
          setImageObject(img);
          canvas.renderAll();
          saveCanvasState();
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const openAttachmentModal = () => {
    setIsAttachmentModalOpen(true);
  };

  const closeAttachmentModal = () => {
    setIsAttachmentModalOpen(false);
  };

  const handleSaveButtonClick = () => {
    // Open the attachment modal when the "Save" button is clicked
    openAttachmentModal();
  };

  const handleAttachmentNameChange = (e) => {
    setAttachmentName(e.target.value);
  };

  const saveAnnotatedImage = async () => {
    closeAttachmentModal();
    // TODO: make this dynamic not hard coded possibly using the usepatient hook
    const patientUuid = "ac64588b-9376-4ef4-b87f-13782647b4c8";
    // Check if an image object exists
    if (imageObject) {
      // Get the original image object
      const originalImage = canvas.getObjects("image")[0];

      // Capture only the part of the canvas containing the original image and annotations as a data URL
      const annotatedCanvasDataUrl = canvas.toDataURL({
        format: "png",
        left: originalImage.left,
        top: originalImage.top,
        width: originalImage.width,
        height: originalImage.height,
      });

      // Convert the data URL to a Blob
      const blob = await fetch(annotatedCanvasDataUrl).then((res) =>
        res.blob()
      );

      // Create a File from the Blob (you can use the patientUuid as the filename)
      const fileName = attachmentName
        ? `${attachmentName}.png`
        : `${patientUuid}_annotated_image.png`;

      const fileType = "image/png";
      const fileDescription = attachmentName
        ? `Annotated Image: ${attachmentName}`
        : "Annotated Image";

      const file = new File([blob], fileName, { type: fileType });

      // Read the file content as base64
      const base64Content = await readFileAsString(file);

      // Use createAttachment method to save the annotated image
      try {
        await createAttachment(patientUuid, {
          file,
          fileName,
          fileType,
          fileDescription,
          base64Content,
        });

        // Show success toast on successful image save
        showToast({
          description: "Annotated image saved successfully!",
          title: "Image Saved",
          kind: "success",
          critical: true,
        });
      } catch (error) {
        // Show error toast on error
        showToast({
          description: "Error saving annotated image",
          title: "Error",
          kind: "error",
          critical: true,
        });
      }
    }
  };

  return (
    <>
      <Header
        aria-label="Global Header"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          marginTop: "75px",
          zIndex: 1000,
        }}
      >
        <div className="container" style={{ marginTop: "55px" }}>
          <div className="button-group">
            <Button onClick={addShape} style={{ margin: "4px" }}>
              Add Shape
            </Button>
            <Button
              renderIcon={ShapeExclude}
              onClick={() => selectDrawingMode("rectangle")}
              style={{ margin: "4px" }}
            >
              Rectangle
            </Button>
            <Button
              renderIcon={CircleStroke}
              onClick={() => selectDrawingMode("circle")}
              style={{ margin: "4px" }}
            >
              Circle
            </Button>
            <Button
              renderIcon={Draw}
              onClick={() => selectDrawingMode("freehand")}
              style={{ margin: "4px" }}
            >
              Freehand
            </Button>
            <Button
              renderIcon={WatsonHealthTextAnnotationToggle}
              onClick={() => addText()}
              style={{ margin: "4px" }}
            >
              Add Text
            </Button>
            <Button
              onClick={() => colorPickerRef.current.click()}
              style={{ margin: "4px" }}
            >
              <ColorPalette />
            </Button>
            <input
              type="color"
              ref={colorPickerRef}
              style={{ display: "none" }}
              onChange={(event) => changeColor(event.target.value)}
            />

            <Button renderIcon={Undo} onClick={undo} style={{ margin: "4px" }}>
              Undo
            </Button>
            <Button renderIcon={Redo} onClick={redo} style={{ margin: "4px" }}>
              Redo
            </Button>
            <Button onClick={handleSaveButtonClick} style={{ margin: "4px" }}>
              Save
            </Button>
          </div>
        </div>
        <FileUploader
          accept={[".jpg", ".jpeg", ".png", ".gif"]}
          buttonLabel="Upload Image"
          filenameStatus="edit"
          labelText="Upload Image"
          onChange={(event) => handleImageUpload(event)}
          className="file-uploader"
          style={{
            margin: "15px",
          }}
        />
      </Header>
      <div
        style={{
          marginTop: "72px",
        }}
      >
        <div className="canvas-container">
          <canvas ref={canvasRef} width="100%" height="100%" />
        </div>
        {/* Attachment Name Modal */}
        <Modal
          open={isAttachmentModalOpen}
          modalLabel="Enter Attachment Name"
          primaryButtonText="Add attachmnet"
          secondaryButtonText="Cancel"
          onRequestClose={closeAttachmentModal}
          onRequestSubmit={saveAnnotatedImage}
        >
          <TextInput
            id="attachmentNameInput"
            labelText="Attachment Name"
            value={attachmentName}
            onChange={handleAttachmentNameChange}
          />
        </Modal>
      </div>
    </>
  );
};

export default SvgEditor;
