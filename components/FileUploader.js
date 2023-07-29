import React, { useState } from 'react';
import styles from './FileUploader.module.css'; // Import the CSS module


const FileUploader = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [transcript, setTranscript] = useState('');
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
    };

    const handleFileUpload = async () => {
        if (!selectedFile) {
            alert('Please select an audio file.');
            return;
        }

        setIsTranscribing(true);
        setProgress(0);

        const formData = new FormData();
        formData.append('audio', selectedFile);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setProgress(percentCompleted);
                },
            });

            if (response.ok) {
                const data = await response.json();
                setTranscript(data.transcript);
            } else {
                console.error('Failed to get transcription:', response.statusText);
                alert('An error occurred while transcribing the audio.');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('An error occurred while uploading the audio file.');
        } finally {
            setIsTranscribing(false);
        }
    };

    const handleDownloadTranscription = () => {
        const blob = new Blob([transcript], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transcription.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };


    return (
        <div className={`min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center`}>
            <div className={styles.container}>
                <h1 className="text-3xl font-bold mb-6">Audio Transcription</h1>
                <input
                    type="file"
                    accept="audio/mp3"
                    className={`file-input ${styles.fileInput}`}
                    onChange={handleFileChange}
                />
                <button
                    className={`px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md mb-4`}
                    onClick={handleFileUpload}
                    disabled={isTranscribing}
                >
                    {isTranscribing ? 'Transcribing...' : 'Upload and Transcribe'}
                </button>
                {progress > 0 && (
                    <div className={`progress-bar ${styles.progressBar}`}>
                        <div className={`progress ${styles.progress}`} style={{ width: `${progress}%` }} />
                    </div>
                )}
                {isTranscribing && <p className={`transcribing-message ${styles.transcribingMessage}`}>Transcribing audio... Please wait.</p>}
                {transcript && (
                    <div className={`transcript ${styles.transcript}`}>
                        <h3 className="text-xl font-bold mt-6">Transcription:</h3>
                        <p>{transcript}</p>
                        <button className={`download-button ${styles.downloadButton}`} onClick={handleDownloadTranscription}>Download Transcription</button>
                    </div>
                )}
                <p className="mt-4">Please upload an audio file in MP3 format.</p>
            </div>
        </div>
    );
};

export default FileUploader;
