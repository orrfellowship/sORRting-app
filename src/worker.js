self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min.js');
var Schedule = require('./schedule');

self.onmessage = function (msg) {
  switch (msg.data.aTopic) {
    case 'load':
      var dec = new TextDecoder();
      var data = JSON.parse(dec.decode(msg.data.aBuf));
      main(data)
      break;
    case 'populate':
      var dec = new TextDecoder();
      var data = JSON.parse(dec.decode(msg.data.aBuf));
      // console.log('new data returned -- ', data);
      populateCandidates(data);
      break;
    default:
      throw 'no aTopic on incoming message to ChromeWorker';
  }
}

function main({iterations, companies, candidates, slots, candidate_slots}) {

  var maxScore = 0;
  var bestSchedule = null;

  _.each(companies, function(company) {
    company.maxScore = calculateMaxScore(company, candidates);
    company = determineDecemberGrad(company);
  });
  _.each(candidates, function(candidate) {
    candidate.schedule = new Array(slots);
    candidate = determineDecemberGrad(candidate);
  })
  // console.log('candidate[0] -- ', candidates[0]);
  // console.log('company[0] - ', companies[0]);

  for (var i=0; i < iterations; i++) {
    var schedule = new Schedule(candidates, companies, slots, candidate_slots);
    // console.log('candidate schedule -- ', schedule.candidates[0].schedule);
    var data = _.map(schedule.schedule, function(row, i) {
      return {company: companies[i].name, interviews: row, maxScore: companies[i].maxScore, score: calculateScore(companies[i], row)};
    });
    var score = schedule.score();
    self.postMessage(i+1);
    if (score > maxScore) {
      i=0;
      maxScore = score;
      var enc = new TextEncoder("utf-8");
      var arrBuf = enc.encode(JSON.stringify({score: score, data: data, candidates: schedule.candidates, companies: schedule.companies, schedule: schedule.schedule})).buffer;
      self.postMessage({aTopic: 'newMax', aBuf: arrBuf}, [arrBuf]);
      bestSchedule = schedule;
    }
    // break;
  }

  close();
}

function populateCandidates({iterations, companies, candidates, slots, candidate_slots, schedule, newCompanies, newCandidates}) {
  // console.log('schedule -- ', schedule);
  // console.log('companies -- ', companies);
  // console.log('candidates -- ', candidates);
  // console.log('newCandidates -- ', newCandidates);
  // console.log('newCompanies -- ', newCompanies);
  candidates = newCandidates;
  companies = newCompanies;
  candidates = countCandidateInterviews(schedule, candidates, companies, slots);
  var bestSchedule = new Schedule(candidates, companies, slots, candidate_slots, schedule);
  bestSchedule.populateCandidates();

  _.each(companies, function(company) {
    company.maxScore = calculateMaxScore(company, candidates);
  });

  var data = _.map(bestSchedule.schedule, function(row, i) {
    return {company: companies[i].name, interviews: row, maxScore: companies[i].maxScore, score: calculateScore(companies[i], row)};
  });

  var enc = new TextEncoder("utf-8");
  var arrBuf = enc.encode(JSON.stringify({
    score: bestSchedule.score(),
    candidates: countCandidateInterviews(bestSchedule.schedule, candidates, companies, slots),
    data: data})).buffer;
  self.postMessage({aTopic: 'populated', aBuf: arrBuf}, [arrBuf]);

  close();
}

function calculateMaxScore(company, candidates) {
  var maxScore = 0;
  var counter = 0;

  for (var i=0; i < company.preferences.length; i++) {
    if (_.findWhere(candidates, {name: company.preferences[i]})) {
      // Fixme: might not always want this to be out of 20
      maxScore += (20 - i);
      counter++;
    }
    if (counter == 8) break;
  }
  return maxScore;
}

function calculateScore(company, candidates) {
  var score = 0;
  for (var i=0; i < candidates.length; i++) {
    var index = _.indexOf(company.preferences, candidates[i]);
    if (index >= 0) {
      // Fixme: might not always want this to be out of 20
      score += (20 - index);
    }
  }
  return score;
}

function countCandidateInterviews(schedule, candidates, companies, slots) {
  _.each(candidates, function(candidate) { candidate.count = 0; });

  for (var i=0; i < companies.length; i++) {
    for (var j=0; j < slots; j++) {
      var candidate = _.findWhere(candidates, { name: schedule[i][j] });
      if (candidate) candidate.count++;
    }
  }
  return candidates;
}

function determineDecemberGrad(object) {
  if (isDecemberGrad(object.name)) {
    object.decGrad = true;
  } else {
    object.decGrad = false;
  }
  object.name = trimName(object.name);
  return object;
}

function isDecemberGrad(name) {
  return indexOf(name, '?') !== -1;
}

function trimName(name) {
  var pos = indexOf(name, '?');
  if (pos !== -1) {
    return name.slice(0, pos);
  }
  return name;
}

function indexOf(str, findChar) {
  for (var i=0; i < str.length; i++) {
    if (str[i] === findChar) {
      return i;
    }
  }
  return -1;
}