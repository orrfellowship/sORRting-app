<template>
  <div id="tile">
    <div id="content">
      <span>#{{index + 1}} - Score: {{result.score}}, Adjusted {{result.adjScore}} </span>
      <a id="score" target="_blank" :download="file_name" :href="csv"><img src="./assets/arrow.png" width="15"></a>
      <button @click="generateSchedule">Generate Final Schedule</button>
      <a id="final" target="_blank" :download="final_name" :href="populated" v-if="populated"> Download</a>
    </div>
  </div>
</template>

<script>
import _ from 'underscore'
var MyWorker = require("worker-loader!./worker.js");
export default {
  name: 'results-tile',
  props: [ 'result', 'input', 'data', 'index' ],
  data: () => ({
    populated: ''
  }),
  computed: {
    final_name: function() {
      return "final-" + this.result.score + ".csv";
    },
    file_name: function() {
      return "score-" + this.result.score + ".csv";
    },
    csv: function () {
      var self = this;
      var csvContent = ["Company", "Top Preferences", "Slot 1", "Slot 2", "Slot 3", "Slot 4", "Slot 5", "Slot 6", "Slot 7", "Slot 8",
        "Max Score Possible", "Company Score", "Percentage of Max Possible", "Adjusted Score"].join(",");
      csvContent += "\n";
      var max = 0;
      _.each(self.result.data, function(obj, index){
        var output = [obj.company, obj.preferences, ...obj.interviews, obj.maxScore, obj.score, obj.percentageOfMax, obj.adjScore];

        output = _.map(output, function(a) {
          return a ? '"' + a + '"' : "";
        })

        var dataString = output.join(",");
        csvContent += index < self.result.data.length ? dataString+ "\n" : dataString;
        max += obj.maxScore;
      });

      self.$emit('report-max', max);

      csvContent += " ,\n\n";
      csvContent += ["Candidate", "Interview Count", "Slot 1", "Slot 2", "Slot 3", "Slot 4", "Slot 5",
        "Slot 6", "Slot 7", "Slot 8", "Consecutive Interviews"].join(",");
      csvContent += "\n";
      _.each(self.result.candidates, function(candidate, index){
        var output = [candidate.name, candidate.count, ...candidate.schedule, candidate.repeats];

        output = _.map(output, function(a) {
          return a ? '"' + a + '"' : "";
        })

        var dataString = output.join(",");
        csvContent += index < self.result.candidates.length ? dataString+ "\n" : dataString;
      });

      var encodedUri = encodeURI(csvContent);
      return "data:text/csv;charset=utf-8," + encodedUri;
    }
  },
  methods: {
    generateSchedule() {
      var self = this;
      var worker = new MyWorker();

      var enc = new TextEncoder("utf-8");
      var arrBuf = enc.encode(JSON.stringify(_.extend(this.input,
        {
          schedule: this.result.schedule,
          newCompanies: this.result.companies,
          newCandidates: this.result.candidates,
          maxConsecutive: this.result.maxConsecutive
        }))).buffer;
      worker.postMessage({aTopic: 'populate', aBuf: arrBuf}, [arrBuf]);

      worker.onmessage = function (msg) {
        var dec = new TextDecoder();
        var data = JSON.parse(dec.decode(msg.data.aBuf));
        debugger;

        var csvContent = ["Company", "Top Preferences", "Slot 1", "Slot 2", "Slot 3", "Slot 4", "Slot 5", "Slot 6", "Slot 7", "Slot 8",
          "Max Score Possible", "Company Score", "Percentage of Max", "Adjusted Score"].join(",");
        csvContent += "\n";
        _.each(data.data, function(obj, index){
          var output = [obj.company, obj.preferences, ...obj.interviews, obj.maxScore, obj.score, obj.percentageOfMax, obj.adjScore];

          output = _.map(output, function(a) {
            return a ? '"' + a + '"' : "";
          })

          var dataString = output.join(",");
          csvContent += index < data.data.length ? dataString+ "\n" : dataString;
        });

        csvContent += " ,\n\n";
        csvContent += ["Candidate", "Interview Count", "Slot 1", "Slot 2", "Slot 3", "Slot 4", "Slot 5",
          "Slot 6", "Slot 7", "Slot 8", "Consecutive Interviews"].join(",");
        csvContent += "\n";
        _.each(data.candidates, function(candidate, index){

          var output = [candidate.name, candidate.count, ...candidate.schedule, candidate.repeats];

          output = _.map(output, function(a) {
            return a ? '"' + a + '"' : "";
          })

          var dataString = output.join(",");
          csvContent += index < data.candidates.length ? dataString+ "\n" : dataString;
        });

        var encodedUri = encodeURI(csvContent);
        self.populated = "data:text/csv;charset=utf-8," + encodedUri;
      }
    }
  }
}
</script>

<style>
#tile {
  width: 100%;
  height: 60px;
  color: #EF5C3C;
}

#content {
  line-height: 40px;
  width: 40%;
  margin-left: calc(50% - 250px);
  height: 40px;
  border: 2px solid #223958;
  border-radius: 4px
}

#content span {
  float: left;
  margin-left: 20px;
}

a {
  border: 1px solid white;
}

a#score {
  border-radius: 100%;
  height: 30px;
  width: 30px;
  margin-left: 10px;
  float: left;
}

a#final {
  padding: 0 10px;
  float: right;
}

a img {
  position: relative;
  top: -2px;
}
</style>
