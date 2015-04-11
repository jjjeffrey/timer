#!/usr/bin/env node

process.title = 'timer';

var fs = require('fs');
var path = require('path');
var blessed = require('blessed');

var screen = blessed.screen({
  autoPadding: true,
  fastCSR: true
});

var defaultFile = {
  "filename": "deletethis.json",
  "title": "Timer",
  "resets": 0,
  "finishes": 0,
  "pbs": 0,
  "playtime": 0,
  "list": [{"name": "Done", "time": null, "best": null }]
};

var writeFlag = 0
  , splits
  , file;

if (process.argv[2]) {
  file = process.argv[2];
}

var chars = {
  '0': [' _ ','| |','|_|'],
  '1': ['   ','  |','  |'],
  '2': [' _ ',' _|','|_ '],
  '3': [' _ ',' _|',' _|'],
  '4': ['   ','|_|','  |'],
  '5': [' _ ','|_ ',' _|'],
  '6': [' _ ','|_ ','|_|'],
  '7': [' _ ','  |','  |'],
  '8': [' _ ','|_|','|_|'],
  '9': [' _ ','|_|',' _|'],
  ':': [  ' ',  '·',  '·'],
  '.': [  ' ',  ' ',  '.']
};

var timer = {
  time: new Date,
  state: 'stopped', // has four states: stopped, paused, going, and finished
  interval: null,
  pauseOffset: 0,
  isPB: false,
  toString: function() {
    var sec, min, hr;
    var inSeconds = (new Date - this.time + this.pauseOffset) / 1000;
    if (inSeconds > 3600) {
      sec = Math.floor(inSeconds % 60) + '';
      min = Math.floor(inSeconds / 60 % 60) + '';
      hr  = Math.floor(inSeconds / 3600) + '';
      if (min.length < 2) {
        min = '0' + min;
      }
      if (sec.length < 2) {
        sec = '0' + sec;
      }
      return hr + ':' + min + ':' + sec;
    } else if (inSeconds > 60) {
      sec = Math.floor(inSeconds % 60) + '';
      min = Math.floor(inSeconds / 60 % 60) + '';
      if (sec.length < 2) {
        sec = '0' + sec;
      }
      return min + ':' + sec;
    }
    return Math.floor(inSeconds % 60) + '';
  },
  toMilli: function() {
    return new Date - this.time + this.pauseOffset;
  }
};

function makeNewSplit(name, time, best, delta) {
  return {
    'name': name,
    'time': time,
    'best': best,
    'delta': delta
  };
}

function loadTimes(file, list, splits, title) {
  var splits = file
               ? require(path.resolve(process.cwd(), file))
               : defaultFile;

  if (splits.filename == null && process.argv[2]) {
    splits.filename = process.argv[2];
  }

  splits.current = 0;
  splits.newList = [];

  for (var i = 0; i < splits.list.length; i++) {
    splits.newList[i] = makeNewSplit(splits.list[i].name, null, null, null);
  }

  var splitarray = [];
  for (var i = 0; i < splits.list.length; i++) {
    if (splits.list[i].time === null) {
      splitarray[i] = splits.list[i].name + '{|}-';
    } else {
      splitarray[i] = splits.list[i].name + '{|}' + milliToTime(splits.list[i].time);
    }
  }

  title.setContent(splits.title);
  list.setItems(splitarray);
  return splits;
}

function updateTime() {
  var time = timer.toString()
    , timestr = '';
  for (var row = 0; row < 3; row++) {
    for (var i = 0; i < time.length; i++) {
      timestr += chars[time[i]][row];
    }
    timestr += '\n';
  }
  timebox.setContent(timestr);
  screen.render();
}

function timerColor() {
  switch (timer.state) {
    case 'stopped':
    case 'paused':
      return 'blue';
    case 'going':
      return 'cyan';
    case 'finished':
      return 'white';
    default:
      return 'yellow';
  }
}

function startTimer() {
  timer.state = 'going';
  screen.render();
  timer.time = new Date;
  timer.interval = setInterval(updateTime, 1000);
}

function pauseTimer() {
  timer.state = 'paused';
  timer.pauseOffset += timer.toMilli() - timer.pauseOffset;
  timer.time = new Date;
  clearInterval(timer.interval);
  updateTime();
}

function resetTimes() {
  var splitarray = [];
  for (var i = 0; i < splits.list.length; i++) {
    if (splits.list[i].time === null) {
      splitarray[i] = splits.list[i].name + '{|}-';
    } else {
      splitarray[i] = splits.list[i].name + '{|}' + milliToTime(splits.list[i].time);
    }
  }
  list.setItems(splitarray);
}

function updatePlaytime() {
  splits.playtime += timer.toMilli();
}

function resetTimer() {
  if (timer.state === 'going') {
    splits.resets += 1;
  }
  timer.state = 'stopped';
  clearInterval(timer.interval);
  timer.time = new Date;
  timer.pauseOffset = 0;
  list.select(0);
  resetTimes();
  splits.current = 0;

  if (writeFlag === 0) {
    for (var i = 0; i < splits.list.length; i++) {
      if (splits.newList[i].best !== null) {
        splits.list[i].best = splits.newList[i].best;
      }
      splits.newList[i].delta = null;
      splits.newList[i].time = null;
      splits.newList[i].best = null;
    }
  }

  timer.isPB = false;
  writeFlag = 0;
  updateTime();
}

function toggleTimer() {
  if (timer.state === 'paused') {
    startTimer();
  } else if (timer.state === 'going') {
    pauseTimer();
  }
}

function milliToTime(n) {
  var n = Math.abs(Math.floor(n / 1000))
    , hr  = Math.floor(n / 3600)
    , min = Math.floor(n / 60 % 60)
    , sec = n % 60;

  if (hr > 0) {
    if (sec < 10) {
      sec = '0' + sec;
    }
    if (min < 10) {
      min = '0' + min;
    }
    return hr + ':' + min + ':' + sec;
  } else if (min > 0) {
    if (sec < 10) {
      sec = '0' + sec;
    }
    return min + ':' + sec;
  } else {
    return sec + '';
  }
}

function milliToDelta(n) {
  var nInSec = Math.abs(Math.floor(n / 1000))
    , hr  = Math.floor(nInSec / 3600)
    , min = Math.floor(nInSec / 60 % 60)
    , sec = nInSec % 60
    , ms = Math.abs(n) % 1000
    , ds = Math.floor(ms / 100);

  if (hr > 0) {
    if (sec < 10) {
      sec = '0' + sec;
    }
    if (min < 10) {
      min = '0' + min;
    }
    return hr + ':' + min + ':' + sec;
  } else if (min > 0) {
    if (sec < 10) {
      sec = '0' + sec;
    }
    return min + ':' + sec;
  } else {
    return sec + '.' + ds;
  }
}

function updateSplits() {
  var splitarray = [];
  for (var i = 0; i < splits.list.length; i++) {
  // if this split is past the current split, just display pb time
    if (i >= splits.current) {
      if (splits.list[i].time === null) {
        splitarray[i] = splits.list[i].name + '{|}-';
      } else {
        splitarray[i] = splits.list[i].name + '{|}' + milliToTime(splits.list[i].time);
      }
    } else if (i < splits.current) {
      if (splits.newList[i].delta === null && splits.newList[i].time !== null) {
        // if this split didn't happen before, just display the newly gotten time
        splitarray[i] = '{black-fg}' + splits.list[i].name + '{/black-fg}{|}{cyan-fg}' + milliToTime(splits.newList[i].time) + '{/cyan-fg}';
      } else if (splits.newList[i].delta === null && splits.newList[i].time === null) {
        // else if this split was skipped, display dash
        splitarray[i] = '{black-fg}' + splits.list[i].name + '{|}-{/black-fg}';
      } else {
        // else this split happened during the run, display the delta
        splitarray[i] = '{black-fg}' + splits.list[i].name + '{/black-fg}{|}' + splits.newList[i].delta;
      }
    }
  }
  list.setItems(splitarray);
  screen.render();
}

function skipSplit() {
  if (splits.current !== splits.list.length - 1 && timer.state !== 'finished') {
    splits.newList[splits.current].time = null;
    splits.newList[splits.current].best = splits.list[splits.current].best;
    splits.newList[splits.current].delta = null;
    splits.current++;
    list.select(splits.current);
    updateSplits();
  }
}

function undoSplit() {
  if (splits.current !== 0 && timer.state !== 'finished') {
    splits.current--;
    list.select(splits.current);
    updateSplits();
  }
}

function splitFn() {
  t = timer.toMilli();
  splits.newList[splits.current].time = t;

  if (splits.list[splits.current].time !== null) {
    delta = t - splits.list[splits.current].time;
    if (delta < 0) {
      delta = '{green-fg}-' + milliToDelta(delta) + '{/green-fg}';
    } else if (delta > 0) {
      delta = '{red-fg}+' + milliToDelta(delta) + '{/red-fg}';
    } else if (delta === 0) {
      delta = '{blue-fg}±' + milliToDelta(delta) + '{/blue-fg}';
    }
    splits.newList[splits.current].delta = delta;
  }
  
  var segment;

  if (splits.current === 0 || splits.newList[splits.current - 1].time === null) {
    segment = t;
  } else if (splits.current !== 0 && splits.newList[splits.current - 1].time !== null) {
    segment = t - splits.newList[splits.current - 1].time;
  }

  if (splits.list[splits.current].best === null || segment < splits.list[splits.current].best) {
    splits.newList[splits.current].best = segment;
  } else {
    splits.newList[splits.current].best = splits.list[splits.current].best;
  }

  splits.current++;
  list.select(splits.current);
  updateSplits();

  if (splits.current === splits.list.length) {
    finish();
  }
}

function finish() {
  timer.state = 'finished';
  if (splits.list[splits.list.length - 1].time !== null) {
    var time1 = splits.newList[splits.list.length - 1].time;
    var time2 = splits.list[splits.list.length - 1].time;
    if (time1 < time2) {
      splits.pbs += 1;
      timer.isPB = true;
    }
  } else {
    splits.pbs += 1;
    timer.isPB = true;
  }
  clearInterval(timer.interval);
  updateTime();
  splits.finishes += 1;
}

function writeSplitsToFile() {
  writeFlag = 1;
  if (timer.state === 'finished' && timer.isPB === true) {
    for (var i = 0; i < splits.list.length; i++) {
      splits.list[i].time = splits.newList[i].time;
      splits.list[i].best = splits.newList[i].best;
    }
  } else if (timer.state === 'finished') {
    for (var i = 0; i < splits.list.length; i++) {
      splits.list[i].best = splits.newList[i].best;
    }
  } else {
    for (var i = 0; i < splits.list.length; i++) {
      if (splits.newList[i].best !== null) {
        splits.list[i].best = splits.newList[i].best;
      }
    }
  }
  delete splits.newList;
  delete splits.current;
  if (timer.state === 'stopped' || timer.state === 'finished') {
    fs.writeFileSync(splits.filename, JSON.stringify(splits, undefined, 2), 'utf8');
  }
}

function setNewSplits() {
  splits.current = 0;
  splits.newList = [];
  for (var i = 0; i < splits.list.length; i++) {
    splits.newList[i] = makeNewSplit(splits.list[i].name, null, null, null);
  }
  resetTimer();
}

var title = blessed.box({
  parent: screen,
  top: 0,
  left: 0,
  align: 'center',
  width: '100%',
  content: 'Splits',
  tags: true,
  fg: 'white',
  bg: 'default'
});

var list = blessed.list({
  parent: screen,
  label: '',
  align: 'left',
  mouse: true,
  top: 1,
  width: '100%',
  bottom: 3,
  style: {
    fg: 'blue',
    bg: 'default',
    selected: {
      bg: 'magenta'
    },
    item: {
      hover: {
        fg: 'white',
        bg: 'black',
        bold: true
      }
    }
  },
  tags: true,
  items: ['Loading...'],
  scrollbar: {
    ch: ' ',
    track: {
      bg: 'yellow'
    },
    style: {
      inverse: true
    }
  }
});

var timebox = blessed.box({
  parent: screen,
  content: 'time',
  align: 'right',
  tags: true,
  right: 1,
  bottom: 0,
  width: 0,
  height: 3,
  fg: timerColor,
  bg: 'default',
  bold: true
});

splits = loadTimes(file, list, splits, title);
updateTime();

screen.key('q', function() {
  process.exit(0);
});

screen.key('space', function() {
  if (timer.state !== 'finished') {
    if (timer.state !== 'going') {
      startTimer();
    } else if (timer.state === 'going') {
      splitFn();
    } else if (timer.state === 'paused') {
      toggleTimer();
    }
  }
});

screen.key('r', function() {
  updatePlaytime();
  resetTimer();
});

screen.key('o', function() {
  updatePlaytime();
  writeSplitsToFile();
  setNewSplits();
});

screen.key('p', function() {
  toggleTimer();
});

screen.key('left', function() {
  undoSplit();
});

screen.key('right', function() {
  skipSplit();
});

list.on('element click', function() {
  list.select(splits.current);
  screen.render();
});
