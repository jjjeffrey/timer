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
  "list":[
    {"name": "Done","time": null,"best": null}
  ]
};

var file;

if (process.argv[2]) {
  file = process.argv[2];
}

var writeFlag = 0;

var splits;

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
  ':': [' ',  '·',  '·'  ],
  '.': [' ',  ' ',  '.'  ]
};

var color_flag = 0;

var gto; // global timeout

var gtimer = {
  paused: 0,
  going: 0,
  time: null,
  pauseOffset: 0,
  toString: function() {
    if (this.time === null) {
      var inSeconds = this.pauseOffset / 1000;
    } else {
      var inSeconds = (new Date - this.time + this.pauseOffset) / 1000;
    }
    if (inSeconds > 3600) {
      var sec = Math.floor(inSeconds % 60) + '';
      var min = Math.floor(inSeconds / 60 % 60) + '';
      var hr  = Math.floor(inSeconds / 3600) + '';
      if (min.length < 2) {
        min = '0' + min;
      }
      if (sec.length < 2) {
        sec = '0' + sec;
      }
      return hr + ':' + min + ':' + sec;
    } else if (inSeconds > 60) {
      var sec = Math.floor(inSeconds % 60) + '';
      var min = Math.floor(inSeconds / 60 % 60) + '';
      if (sec.length < 2) {
        sec = '0' + sec;
      }
      return min + ':' + sec;
    } else {
      var sec = Math.floor(inSeconds % 60) + '';
      return sec;
    }
  },
  toMilli: function() {
    if (this.time === null) {
      return 0;
    } else {
      return (new Date - this.time + this.pauseOffset);
    }
  },
  finished: 0,
  isPB: 0
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
  for(var i = 0; i < splits.list.length; i++) {
    if (splits.list[i].time === null) {
      splitarray[i] = splits.list[i].name + '{|}' + '-';
    } else {
      splitarray[i] = splits.list[i].name + '{|}' + milliToTime(splits.list[i].time);
    }
  }
//  list.setLabel(splits.title);
  title.setContent(splits.title);
  list.setItems(splitarray);

  return splits;
}

function updateTime() {
  var time = gtimer.toString();
  var timestr = '';
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
  if (color_flag === 0) {
//  if (gtimer.going === 0 || gtimer.paused === 1) {
    return 'blue';
  } else if (color_flag === 1) {
//  } else if (gtimer.going === 1 && gtimer.paused === 0) {
    return 'cyan';
  } else if (color_flag === 2) {
//  } else if (gtimer.finished === 1) {
    return 'white';
  } else {
    return 'yellow';
  }
}

function startTimer() {
  gtimer.going = 1;
  color_flag = 1;
  updateTime();
  gtimer.time = new Date;
  gto = setTimeout(goingTimer, 1000);
}

function goingTimer() {
  if (gtimer.going === 0) {
    clearTimeout(gto);
    return;
  }
  updateTime();
  gto = setTimeout(goingTimer, 1000);
}

function stopTimer() {
  gtimer.going = 0;
  clearTimeout(gto);
  updateTime();
}

function pauseTimer() {
  gtimer.pauseOffset += gtimer.toMilli() - gtimer.pauseOffset;
  gtimer.time = null;
  clearTimeout(gto);
  updateTime();
}

function resetTimes() {
  var splitarray = [];
  for(var i = 0; i < splits.list.length; i++) {
    if (splits.list[i].time === null) {
      splitarray[i] = splits.list[i].name + '{|}' + '-';
    } else {
      splitarray[i] = splits.list[i].name + '{|}' + milliToTime(splits.list[i].time);
    }
  }
  list.setItems(splitarray);
}

function updatePlaytime() {
  splits.playtime += gtimer.toMilli();
}

function resetTimer() {
  if (gtimer.going === 1) {
    splits.resets += 1;
  }
  
  gtimer.going = 0;
  gtimer.paused = 0;
  clearTimeout(gto);
  gtimer.time = null;
  gtimer.pauseOffset = 0;
  color_flag = 0;
  list.select(0);
  resetTimes();
  splits.current = 0;
  
  if (writeFlag == 0) {
    for (var i = 0; i < splits.list.length; i++) {
      if (splits.newList[i].best !== null) {
        splits.list[i].best = splits.newList[i].best;
      }
      splits.newList[i].delta = null;
      splits.newList[i].time = null;
      splits.newList[i].best = null;
    }
  }
  
  gtimer.finished = 0;
  gtimer.isPB = 0;
  writeFlag = 0;
  updateTime();
}

function toggleTimer() {
  if (gtimer.paused === 0) {
    gtimer.paused = 1;
    color_flag = 0;
    pauseTimer();
  } else if (gtimer.paused === 1) {
    gtimer.paused = 0;
    startTimer();
  }
}

function milliToTime(n) {
  var n = Math.abs(Math.floor(n / 1000));
  var hr  = Math.floor(n / 3600);
  var min = Math.floor(n / 60 % 60);
  var sec = n % 60;
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
  var nInSec = Math.abs(Math.floor(n / 1000));
  var hr  = Math.floor(nInSec / 3600);
  var min = Math.floor(nInSec / 60 % 60);
  var sec = nInSec % 60;
  var ms = Math.abs(n) % 1000;
//  var cs = Math.floor(ms / 10);
  var ds = Math.floor(ms / 100);
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

function sumOfBest(splits) {
  var t = 0;
  for (var i = 0; i < splits.list.length; i++) {
    t += splits.list[i].best;
  }
  return t;
}

function updateSplits() {
  var splitarray = [];
  for (var i = 0; i < splits.list.length; i++) {
    if (i >= splits.current) { // if this split is past the current split, just display pb time
      if (splits.list[i].time === null) {
        splitarray[i] = splits.list[i].name + '{|}' + '-';
      } else {
        splitarray[i] = splits.list[i].name + '{|}' + milliToTime(splits.list[i].time);
      }
    } else if (i < splits.current) {
      if (splits.newList[i].delta === null && splits.newList[i].time !== null) {
        // if this split didn't happen before, just display the newly gotten time
        splitarray[i] = '{#555555-fg}' + splits.list[i].name + '{/#555555-fg}' + '{|}' + '{cyan-fg}' + milliToTime(splits.newList[i].time) + '{/cyan-fg}';
      } else if (splits.newList[i].delta === null && splits.newList[i].time === null) {
        // if split was skipped, display dash
        splitarray[i] = '{#555555-fg}' + splits.list[i].name + '{|}' + '-' + '{/#555555-fg}';
      } else {
        // if this split happened during the run, display the delta
        splitarray[i] = '{#555555-fg}' + splits.list[i].name + '{/#555555-fg}' + '{|}' + splits.newList[i].delta;// + ' ' + splits.times[i];
      }
    }
  }
  list.setItems(splitarray);
  screen.render();
}

function skipSplit() {
  if (splits.current !== splits.list.length - 1 && gtimer.finished !== 1) {
    splits.newList[splits.current].time = null;
    splits.newList[splits.current].best = splits.list[splits.current].best;
    splits.newList[splits.current].delta = null;
    splits.current++;
    list.select(splits.current);
    updateSplits();
  }
}

function undoSplit() {
  if (splits.current !== 0 && gtimer.finished !== 1) {
    splits.current--;
    list.select(splits.current);
    updateSplits();
  }
}

function splitFn() {
  t = gtimer.toMilli();
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
}

function finish() {
  gtimer.finished = 1;
  if (splits.list[splits.list.length - 1].time !== null) {
    var time1 = splits.newList[splits.list.length - 1].time;
    var time2 = splits.list[splits.list.length - 1].time;
    if (time1 < time2) {
      splits.pbs += 1;
      gtimer.isPB = 1;
    }
  } else {
    splits.pbs += 1;
    gtimer.isPB = 1;
  }
  color_flag = 2;
  stopTimer();
  splits.finishes += 1;
}

function writeSplitsToFile() {
  writeFlag = 1;
  if (gtimer.finished === 1 && gtimer.isPB === 1) {
    for (var i = 0; i < splits.list.length; i++) {
      splits.list[i].time = splits.newList[i].time;
      splits.list[i].best = splits.newList[i].best;
    }
  } else if (gtimer.isfinished === 1) {
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
  if (gtimer.going === 0 && gtimer.paused === 0) { // only check the going variable?
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
//  left: 1,
//  align: 'left',
  left: 0,
  align: 'center',
  width: '100%',
  content: 'Game',
  tags: true,
  fg: 'white',
  bg: 'default'
});

var list = blessed.list({
  parent: screen,
  label: 'Splits',
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
//  left: 1,
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

screen.render();

screen.key('q', function() {
  process.exit(0);
});

screen.key('space', function() {
  if (gtimer.finished === 0) {
    if (gtimer.going === 0) {
      startTimer();
    } else if (gtimer.going === 1 && gtimer.paused === 0) {
      splitFn();
      if (splits.current === splits.list.length) {
        finish();
      }
    } else if (gtimer.going === 1 && gtimer.paused === 1) {
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
