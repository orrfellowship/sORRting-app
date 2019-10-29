<template>
  <div id="app">
    <HelpContainer
    <img src="./assets/OrrFellowship.png" width="300">
    <h1>Welcome to the SchedulORR</h1>
    <FileInput item="preferences" @set-data="setData"></FileInput>
    <FileInput item="candidates" @set-data="setData"></FileInput>
    <div>
      <TextInput label="Interviews / Company" item="slots" default_val="8" @set-data="setData"></TextInput>
      <TextInput label="Interviews / Candidate" item="candidate_slots" default_val="4" @set-data="setData"></TextInput>
      <TextInput label="iterations" item="iterations" default_val="1000" @set-data="setData"></TextInput>
    </div>
    <button class="tooltip" @click="startWorker" :disabled="validation_msg.length > 0">Let's Go<span class="tooltiptext" v-if="validation_msg.length > 0">{{ this.validation_msg }}</span></button>
    <a id="help" href="#" @click="toggleHelp">need help?</a>
    <div id="help-overlay" v-if="help" @click="toggleHelp">
      <div id="help-container">
        <img src="./assets/getting_started.png" width="100%">
      </div>
    </div>
    <ResultsContainer :current="currentIteration" :results="results" :input="data" @resetResults="resetResults"></ResultsContainer>
    <Copyright></Copyright>
  </div>
</template>

<script>
import _ from 'underscore';
var MyWorker = require("worker-loader!./worker.js");
import Copyright from './Copyright.vue'
import FileInput from './FileInput.vue'
import TextInput from './TextInput.vue'
import ResultsContainer from './ResultsContainer.vue'
export default {
  name: 'app',
  components: { Copyright, FileInput, TextInput, ResultsContainer },
  data: () => ({
    data: {iterations: 1000, slots: 8, candidate_slots: 4},
    validation_msg: "Please upload all the required files.",
    currentIteration: 0,
    results: [],
    worker: null,
    help: false
  }),
  methods: {
    resetResults() {
      this.currentIteration = 0;
      this.results = [];
      this.worker.terminate();
    },
    validate() {
      this.validation_msg = "";
      if (!this.data.iterations) this.validation_msg = "Please enter a valid number of iterations.";
      else if (!this.data.slots) this.validation_msg = "Please enter a valid number of interview slots.";
      else if (!this.data.candidate_slots) this.validation_msg = "Please enter a valid number of candidate interview slots.";
      else if (!this.data.candidates || !this.data.companies) this.validation_msg = "Please upload all the required files.";
      else {
        // Validate Candidates File
        if (!this.data.companies[0].name || !_.isArray(this.data.companies[0].preferences)) this.validation_msg = "Make sure your input files are correct - company preferences should be company, pref1, pref2, ...";
        else if (this.data.candidates.length != 2*this.data.companies.length) {
          this.validation_msg = "Make sure your input files are correct - there should be twice as many candidates as companies.";
          console.log('candidates length -- ', this.data.candidates.length);
          console.log('companies length -- ', this.data.companies.length);
        }
      }

      return _.isEmpty(this.validation_msg);
    },
    setData(data) {
      this.data = _.extend(this.data, data);
      this.validate();
    },
    startWorker() {
      var self = this;
      this.worker = new MyWorker();
      var enc = new TextEncoder("utf-8");
      var arrBuf = enc.encode(JSON.stringify(this.data)).buffer;

      this.worker.postMessage({aTopic: 'load', aBuf: arrBuf}, [arrBuf]);

      this.worker.onmessage = function (msg) {
        if (!msg.data.aTopic) {
          self.currentIteration = event.data;
          return;
        }

        var dec = new TextDecoder();
        var data = JSON.parse(dec.decode(msg.data.aBuf));

        self.results.unshift(data);
        console.log('data returned -- ', data);
      }
    },
    toggleHelp() {
      this.help = !this.help;
    }
  }
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

#help-overlay {
  position: absolute;
  background-color: rgba(0,0,0,.5);
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

#help-container {
  border-radius: 8px;
  max-width: 800px;
  height: 568px;
  margin-left: calc(50% - 400px);
  margin-top: 50px;
  overflow: hidden;
}

h1, h2 {
  font-weight: normal;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  display: inline-block;
  margin: 0 10px;
}

a {
  color: #42b983;
  font-size: 12px;
}

a#help {
  display: block;
  margin-top: 40px
}

.tooltip {
    position: relative;
    display: inline-block;
}

/* Tooltip text */
.tooltip .tooltiptext {
    width: 200px;
    background-color: #223958;
    color: #fff;
    text-align: center;
    padding: 5px 0;
    border-radius: 6px;

    /* Position the tooltip text */
    position: absolute;
    z-index: 1;

    margin-top: 4px;
    top: 100%;
    left: 50%;
    margin-left: -100px;

    opacity: 0;
    -o-transition:opacity .2s ease-out;
    -ms-transition:opacity .2s ease-out;
    -moz-transition:opacity .2s ease-out;
    -webkit-transition:opacity .2s ease-out;
    transition:opacity .2s ease-out;
}

/* Show the tooltip text when you mouse over the tooltip container */
.tooltip:hover .tooltiptext {
    opacity: 1;
}
</style>
