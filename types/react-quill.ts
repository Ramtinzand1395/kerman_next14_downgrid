declare module "react-quill" {
  import type { ComponentType } from "react";

  export interface ReactQuillProps {
    theme?: string;
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
  }

  const ReactQuill: ComponentType<ReactQuillProps>;
  export default ReactQuill;
}
