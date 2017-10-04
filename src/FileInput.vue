<template>
  <div id="file-input">
    <label :for="item">{{ item }}</label>
    <input type="file" :id="item" @change="processFile($event)" />
  </div>
</template>

<script>
import _ from 'underscore'
export default {
  name: 'file-input',
  props: ['item'],
  methods: {
    processFile(event) {
      if (this.item == 'preferences') {
        processPreferences(event.target.files[0], (output) => {
          this.$emit('set-data', {companies: output});
        });
      }
      if (this.item == 'candidates') {
        processCandidates(event.target.files[0], (output) => {
          this.$emit('set-data', {candidates: output});
        });
      }
    }
  }
}

const CSV_SEPARATOR = ',';

function processCandidates(file, cb) {
  var reader = new FileReader();
  var output = [];
  reader.onload = function(progressEvent){
    var lines = this.result.split('\n');
    var data = lines[0].split(CSV_SEPARATOR);
    output = _.map(data, function(c) {
      return {name: c, count: 0};
    });
    return cb(output);
  };
  reader.readAsText(file);
};

function processPreferences(file, cb) {
  var reader = new FileReader();
  var output = [];
  reader.onload = function(progressEvent){
    var lines = this.result.split('\n');
    for(var i = 0; i < lines.length; i++){
      var input = lines[i].split(CSV_SEPARATOR);
      var company = {};
      company.name = input[0];
      company.preferences = _.map(input.slice(1, input.length-1), function(c) {
        return c;
      });
      output.push(company);
    }
    return cb(output);
  };
  reader.readAsText(file);
};

</script>

<style>
#file-input {
  width: 200px;
  display: inline-block;
  padding-left: 20px;
  padding-right: 20px;
}
</style>
