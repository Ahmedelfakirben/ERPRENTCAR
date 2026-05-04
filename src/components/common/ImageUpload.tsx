import React, { useState, useRef } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ImageUploadProps {
  bucket: 'vehicles' | 'documents' | 'clients';
  onUploadComplete: (url: string) => void;
  label?: string;
  currentImage?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ bucket, onUploadComplete, label, currentImage }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Vous devez slectionner une image.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = fileName;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      setPreview(publicUrl);
      onUploadComplete(publicUrl);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setPreview(null);
    onUploadComplete('');
  };

  return (
    <div className="input-group">
      {label && <label className="input-label">{label}</label>}
      <div className="image-upload-container">
        {preview ? (
          <div className="image-preview-wrapper card">
            <img src={preview} alt="Upload preview" className="image-preview" />
            <button className="remove-image-btn" onClick={removeImage}>
              <X size={16} />
            </button>
          </div>
        ) : (
          <div 
            className="upload-dropzone card"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="animate-spin text-gold" size={24} />
            ) : (
              <>
                <Upload size={24} className="text-secondary mb-2" />
                <span className="text-xs text-secondary">Cliquez pour slectionner</span>
              </>
            )}
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleUpload}
          accept="image/*"
          className="hidden"
          style={{ display: 'none' }}
        />
      </div>
      
      <style>{`
        .image-upload-container {
          width: 100%;
        }
        .upload-dropzone {
          height: 120px;
          border: 2px dashed var(--border);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--t-fast);
          background: var(--surface-2);
        }
        .upload-dropzone:hover {
          border-color: var(--gold);
          background: rgba(201, 168, 76, 0.05);
        }
        .image-preview-wrapper {
          position: relative;
          height: 120px;
          overflow: hidden;
          background: #000;
        }
        .image-preview {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.9;
        }
        .remove-image-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0,0,0,0.6);
          color: white;
          border: none;
          padding: 4px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--t-fast);
        }
        .remove-image-btn:hover {
          background: var(--error);
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
};

export default ImageUpload;
