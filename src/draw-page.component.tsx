import React, { useRef } from "react";
import SvgEditor from "./components/custom-annotate.component"; // Update the import path
import "./draw-page.scss"; // Import the CSS file

const DrawPage: React.FC = () => {
  const drawingWidgetRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <div
        ref={drawingWidgetRef}
        className="editor-container"
        id="drawing-widget"
      >
        {/* Render SvgEditor component */}
        <SvgEditor />
      </div>
    </div>
  );
};

export default DrawPage;
