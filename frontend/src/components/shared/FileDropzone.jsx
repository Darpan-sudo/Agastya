import { useDropzone } from 'react-dropzone'
import { Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function FileDropzone({ 
  onDrop, 
  accept, 
  multiple = true, 
  maxFiles,
  children,
  className 
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple,
    maxFiles,
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all",
        "hover:border-primary/50 hover:bg-accent/5",
        isDragActive && "border-primary bg-accent/10",
        !isDragActive && "border-border",
        className
      )}
    >
      <input {...getInputProps()} />
      {children || (
        <>
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground font-medium">
            {isDragActive
              ? "Drop files here..."
              : "Drag & drop files here, or click to select"}
          </p>
        </>
      )}
    </div>
  )
}
