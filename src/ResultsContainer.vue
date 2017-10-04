<template>
  <div id="overlay" v-if="current" @click="closeOverlay">
    <div id="container">
      <div>Progress: {{ current }} / {{ input.iterations }} ({{ Math.round(current / input.iterations * 100)}}%)</div>
      <div id="score">Theoretical Max Score: {{ maxScore }}</div>

      <ResultsTile
        v-for="(result, index) in results"
        v-bind:result="result"
        v-bind:index="index"
        v-bind:key="result.score"
        @report-max="setMax"
        :input="input"
      ></ResultsTile>

    </div>
  </div>
</template>

<script>
import ResultsTile from './ResultsTile.vue'
export default {
  name: 'results-container',
  components: { ResultsTile },
  props: [ 'results', 'current', 'input' ],
  data: () => ({
    maxScore: 0
  }),
  methods: {
    setMax(data) {
      this.maxScore = data;
    },
    closeOverlay(event) {
      if (event.target.id === "overlay") {
        this.$emit('resetResults');
      }
    }
  }
}
</script>

<style>
#overlay {
  position: absolute;
  background-color: rgba(0,0,0,.5);
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

#container {
  margin: 40px;
  border-radius: 8px;
  color: white;
  background-color: #223958;
  padding: 20px 0;

  height: 80%;
  overflow-y: auto;
}

#score {
  margin-bottom: 20px;
}
</style>
