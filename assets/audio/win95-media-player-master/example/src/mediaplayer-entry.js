import React from 'react';
import ReactDOM from 'react-dom';
import { MediaPlayer } from '../../src';

const audioPlaylist = [
  {
    url: 'assets/audio/The Microsoft Sound.mp3',
    title: 'The Microsoft Sound',
    duration: '0:06'
  },
  {
    url: 'assets/audio/Microsoft Windows 95 Startup Sound.mp3',
    title: 'Windows 95 Startup Sound',
    duration: '0:07'
  },
  {
    url: "assets/audio/Bach's Brandenburg Concerto No. 3.mp3",
    title: "Bach's Brandenburg Concerto No. 3",
    duration: '6:10'
  },
  {
    url: "assets/audio/Beethoven's 5th Symphony.mp3",
    title: "Beethoven's 5th Symphony",
    duration: '6:22'
  },
  {
    url: "assets/audio/Beethoven's Fur Elise.mp3",
    title: "Beethoven's Fur Elise",
    duration: '2:36'
  },
  {
    url: 'assets/audio/Dance of the Sugar-Plum Fairy.mp3',
    title: 'Dance of the Sugar-Plum Fairy',
    duration: '1:51'
  },
  {
    url: "assets/audio/Debussy's Claire de Lune.mp3",
    title: "Debussy's Claire de Lune",
    duration: '3:54'
  },
  {
    url: 'assets/audio/In the Hall of the Mountain King.mp3',
    title: 'In the Hall of the Mountain King',
    duration: '2:47'
  },
  {
    url: "assets/audio/Mozart's Symphony No. 40.mp3",
    title: "Mozart's Symphony No. 40",
    duration: '1:11'
  }
];

const videoPlaylist = [
  {
    url: 'https://archive.org/download/Weezer_Buddy_Holly/Weezer_Buddy_Holly.mp4',
    title: 'Weezer - Buddy Holly (Original Win95 CD)',
    duration: '2:59'
  },
  {
    url: 'https://archive.org/download/CC1301_windows_95/CC1301_windows_95_512kb.mp4',
    title: 'Computer Chronicles - Windows 95',
    duration: '27:02'
  },
  {
    url: 'https://archive.org/download/Microsoft_Windows_95_Video_Guide_1995_Uncut_VHS_x264_Aw.mkv/Microsoft_Windows_95_Video_Guide_1995_Uncut_VHS_x264_Aw.mp4',
    title: 'Windows 95 Uncut VHS Video Guide',
    duration: '56:30'
  },
  {
    url: 'assets/video/Magic_words.mp4',
    title: 'Nedry - Ah Ah Ah! (Jurassic Park)',
    duration: '0:04'
  },
  {
    url: 'assets/video/Win_error.mp4',
    title: 'Windows 95 Blue Screen of Death',
    duration: '0:14'
  }
];

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      playlistType: 'audio' // 'audio' or 'video'
    };
  }

  setPlaylistType(type) {
    this.setState({ playlistType: type });
  }

  render() {
    const isAudio = this.state.playlistType === 'audio';
    const playlist = isAudio ? audioPlaylist : videoPlaylist;

    return (
      <div className="player-wrapper">
        <div className="playlist-tabs">
          <button
            className={`tab-btn ${isAudio ? 'active' : ''}`}
            onClick={() => this.setPlaylistType('audio')}
          >
            🎵 Audio tracks
          </button>
          <button
            className={`tab-btn ${!isAudio ? 'active' : ''}`}
            onClick={() => this.setPlaylistType('video')}
          >
            🎬 Video tracks
          </button>
        </div>
        <div className="player-container">
          {isAudio ? (
            <MediaPlayer
              key="audio-player"
              playlist={playlist}
              showVideo={false}
              fullscreenEnabled={false}
              className="win95-player"
            />
          ) : (
            <MediaPlayer
              key="video-player"
              playlist={playlist}
              showVideo={true}
              fullscreenEnabled={true}
              className="win95-player"
            />
          )}
        </div>
      </div>
    );
  }
}

ReactDOM.render(<App />, document.getElementById('app'));
