<template>
  <div id="text-input">
    <label :for="item">{{ label }}</label>
    <input type="text" :id="item" @change="processUpdate($event)" :value="default_val"/>
  </div>
</template>

<script>
import _ from 'underscore'
export default {
  name: 'text-input',
  props: ['item', 'label', 'default_val'],
  methods: {
    processUpdate(event) {
      var output = {};
      output[this.item] = parseInt(event.target.value);
      this.$emit('set-data', output);
    }
  }
}
</script>

<style>
#text-input {
  width: 200px;
  display: inline-block;
  padding: 20px;
}

</style>
