import React, { useState } from 'react';
import AuthService from '../../../service/AuthService';
import OutputParser from '../../../service/OutputParser';

export default function ImageUploader() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<string>("");
    const [publicUrl, setPublicUrl] = useState<string>("");

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setStatus("");
        setPublicUrl("");
        const f = e.target.files?.[0] || null;
        setFile(f);
    };

    const onUpload = async () => {
        if (!file) {
            setStatus('Please select an image first.');
            return;
        }
        try {
            setStatus('Uploading...');
            const key = await AuthService.getInstance().uploadImage(file);
            console.log('Uploaded image with key:', key);
            const bucket = OutputParser.MemoryBucketName;
            const url = `https://${bucket}.s3.amazonaws.com/${encodeURI(key)}`;
            setPublicUrl(url);
            setStatus('Upload complete');
        } catch (err: any) {
            setStatus(err?.message || 'Upload failed');
        }
    };

    return (
        <div style={{ display: 'grid', gap: 8 }}>
            <input type="file" accept="image/*" onChange={onFileChange} />
            <button onClick={onUpload} disabled={!file}>Upload</button>
            {status && <div>{status}</div>}
            {publicUrl && (
                <img src={publicUrl} alt="Uploaded" style={{ maxWidth: '200px', marginTop: '8px' }} />
            )}
        </div>
    );
}
