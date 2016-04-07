#!/usr/bin/env node

process.title = 'timer';

var fs = require('fs');
var path = require('path');
var blessed = require('blessed');

var screen = blessed.screen({
  autoPadding: true,
  fastCSR: true
});

function padded(n) {
  return n < 10
         ? '0' + n
         : n + '';
}

var timer = {
  time: new Date(),
  state: 'stopped', // has four states: stopped, paused, going, and finished
  interval: null,
  pauseOffset: 0,
  isPB: false,
  toString: function() {
    var sec, min, hr;
    var inSeconds = (new Date() - this.time + this.pauseOffset) / 1000;
    if (inSeconds > 3600) {
      sec = Math.floor(inSeconds % 60);
      min = Math.floor(inSeconds / 60 % 60);
      hr  = Math.floor(inSeconds / 3600);
      return hr + ':' + padded(min) + ':' + padded(sec);
    } else if (inSeconds > 60) {
      sec = Math.floor(inSeconds % 60);
      min = Math.floor(inSeconds / 60 % 60);
      return min + ':' + padded(sec);
    }
    return Math.floor(inSeconds % 60) + '';
  },
  toMilli: function() {
    return new Date() - this.time + this.pauseOffset;
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

function loadTimes(fname, list, splits, title) {
  var splits = fname
               ? require(path.resolve(process.cwd(), fname))
               : defaultFile;

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
  var chars = {
    '0': [' ▁ ','| |','|▁|'],
    '1': ['   ','  |','  |'],
    '2': [' ▁ ',' ▁|','|▁ '],
    '3': [' ▁ ',' ▁|',' ▁|'],
    '4': ['   ','|▁|','  |'],
    '5': [' ▁ ','|▁ ',' ▁|'],
    '6': [' ▁ ','|▁ ','|▁|'],
    '7': [' ▁ ','  |','  |'],
    '8': [' ▁ ','|▁|','|▁|'],
    '9': [' ▁ ','|▁|',' ▁|'],
    ':': [  ' ',  '•',  '•'],
    '.': [  ' ',  ' ',  '.']
  };

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
  timer.time = new Date();
  timer.interval = setInterval(updateTime, 1000);
}

function pauseTimer() {
  var t = timer.toMilli();
  timer.time = new Date();
  timer.state = 'paused';
  updatePlaytime(t - timer.pauseOffset);
  timer.pauseOffset += t - timer.pauseOffset;
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

function updatePlaytime(t) {
  if (t == null) {
    splits.playtime += timer.toMilli() - timer.pauseOffset;
  } else {
    splits.playtime += t;
  }
}

function resetTimer() {
  if (timer.state === 'going') {
    splits.resets += 1;
    updatePlaytime();
  }
  timer.state = 'stopped';
  clearInterval(timer.interval);
  timer.time = new Date();
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
    return hr + ':' + padded(min) + ':' + padded(sec);
  } else if (min > 0) {
    return min + ':' + padded(sec);
  } else {
    return sec + '';
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
  var t = timer.toMilli();
  splits.newList[splits.current].time = t;

  if (splits.list[splits.current].time !== null) {
    delta = t - splits.list[splits.current].time;
    if (delta < 0) {
      delta = '{green-fg}-' + milliToTime(delta) + '{/green-fg}';
    } else if (delta > 0) {
      delta = '{red-fg}+' + milliToTime(delta) + '{/red-fg}';
    } else if (delta === 0) {
      delta = '{blue-fg}±' + milliToTime(delta) + '{/blue-fg}';
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
    finish(t);
  }
}

function finish(t) {
  if (timer.state === 'going') {
    updatePlaytime(t);
  }
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
    fs.writeFileSync(fileName, JSON.stringify(splits, undefined, 2), 'utf8');
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

function sumOfBest() {
  var t = 0;
  for (var i = 0; i < splits.list.length; i++) {
    t += splits.list[i].best;
  }
  return t;
}

var title = blessed.box({
  parent: screen,
  top: 0,
  align: 'center',
  width: '100%',
  content: 'Splits',
  fg: 'white',
  bg: 'default'
});

var list = blessed.list({
  parent: screen,
  label: '',
  align: 'left',
  mouse: true,
  top: 1,
  bottom: 3,
  width: '100%',
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
  items: [],
});

var timebox = blessed.box({
  parent: screen,
  content: 'time',
  align: 'right',
  bottom: 0,
  width: '100%',
  height: 3,
  fg: timerColor,
  bg: 'default',
  bold: true
});

var defaultFile = {
  "title": "Timer",
  "resets": 0,
  "finishes": 0,
  "pbs": 0,
  "playtime": 0,
  "list": [{"name": "Done", "time": null, "best": null }]
};

var writeFlag = 0
  , splits
  , fileName;

if (process.argv[2]) {
  fileName = process.argv[2];
  splits = loadTimes(fileName, list, splits, title);
} else {
  fileName = "deletethis.json";
  splits = loadTimes(null, list, splits, title);
}

updateTime();

screen.key('q', function() {
  process.exit(0);
});

screen.key('space', function() {
  switch (timer.state) {
    case 'finished':
      return;
    case 'going':
      return splitFn();
    case 'paused':
      return toggleTimer();
    case 'stopped':
      return startTimer();
  }
});

screen.key('r', function() {
  resetTimer();
});

screen.key('o', function() {
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
