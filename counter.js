#!/usr/bin/env node

process.title = 'counter';

var blessed = require('blessed');

var screen = blessed.screen({
  autoPadding: true,
  fastCSR: true
});

var count = process.argv[2]
  ? parseInt(process.argv[2])
  : 0;

function updateCount() {
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
    '-': ['   ',' ▁ ','   ']
  };
  var countstr = count.toString()
    , countbigstr = '';
  for (var row = 0; row < 3; row++) {
    for (var i = 0; i < countstr.length; i++) {
      countbigstr += chars[countstr[i]][row];
    }
    countbigstr += '\n';
  }
  countbox.setContent(countbigstr);
  screen.render();
}

var countbox = blessed.box({
  parent: screen,
  content: 'count',
  align: 'right',
  bottom: 0,
  width: '100%',
  height: 3,
  fg: 'cyan',
  bg: 'default',
  bold: true
});

screen.key('q', function() {
  process.exit(0);
});

screen.key('space', function() {
  count += 1;
  updateCount();
});

screen.key('backspace', function() {
  count -= 1;
  updateCount();
});

screen.key('r', function() {
  count = 0;
  updateCount();
});

updateCount();
