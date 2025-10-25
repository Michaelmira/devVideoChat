// import React, { useRef, useEffect } from 'react';
// import videojs from 'video.js';
// import 'video.js/dist/video-js.css';

// const RecordingPlayer = ({ hlsUrl, title = "Recording" }) => {
//     const videoRef = useRef(null);
//     const playerRef = useRef(null);

//     useEffect(() => {
//         // Make sure Video.js player is only initialized once
//         if (!playerRef.current) {
//             const videoElement = videoRef.current;
//             if (!videoElement) return;

//             const player = videojs(videoElement, {
//                 controls: true,
//                 responsive: true,
//                 fluid: true,
//                 sources: [{
//                     src: hlsUrl,
//                     type: 'application/x-mpegURL'
//                 }],
//                 html5: {
//                     hls: {
//                         enableLowInitialPlaylist: true,
//                         smoothQualityChange: true,
//                         overrideNative: true
//                     }
//                 }
//             });

//             playerRef.current = player;
//         }
//     }, [hlsUrl]);

//     // Dispose the Video.js player when the functional component unmounts
//     useEffect(() => {
//         const player = playerRef.current;
//         return () => {
//             if (player && !player.isDisposed()) {
//                 player.dispose();
//                 playerRef.current = null;
//             }
//         };
//     }, []);

//     return (
//         <div className="recording-player" style={{ maxWidth: '800px', margin: '20px auto' }}>
//             <h3>{title}</h3>
//             <div data-vjs-player>
//                 <video
//                     ref={videoRef}
//                     className="video-js vjs-default-skin"
//                     controls
//                     preload="auto"
//                     width="800"
//                     height="450"
//                     data-setup="{}"
//                 >
//                     <p className="vjs-no-js">
//                         To view this video please enable JavaScript, and consider upgrading to a web browser that
//                         <a href="https://videojs.com/html5-video-support/" target="_blank" rel="noopener noreferrer">
//                             supports HTML5 video
//                         </a>.
//                     </p>
//                 </video>
//             </div>
//         </div>
//     );
// };

// export default RecordingPlayer; 