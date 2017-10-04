<template>
  <div id="copyright">
    <div id="label">&copy; {{ year }} Michael Welling</div>
  </div>
</template>

<script>
export default {
  name: 'copyright',
  data () {
    return {
      year: (new Date()).getFullYear()
    }
  }
}
</script>

<style>
#copyright {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;

  height: 40px;
  bottom: 0;
  left: 0;
  position: absolute;
  width: 100%;
}

#label {
  left: 50%;
}

</style>
