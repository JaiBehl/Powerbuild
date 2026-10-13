(function () {
  function encodeText(value) {
    return String(value || '')
      .trim()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function decodeText(value) {
    const box = document.createElement('textarea');
    box.innerHTML = String(value || '');
    return box.value;
  }

  function persistWithoutRender() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  if (typeof state.sessionNotes !== 'string') state.sessionNotes = '';

  function injectSessionNotes() {
    if (!state.sessionStarted) return;
    const actions = document.querySelector('#train .training-actions');
    if (!actions || document.getElementById('sessionNotes')) return;

    const card = document.createElement('div');
    card.className = 'card';
    card.style.marginTop = '16px';
    card.style.padding = '20px';
    card.style.background = '#14243a';

    const heading = document.createElement('h3');
    heading.textContent = 'Session notes';
    heading.style.marginBottom = '14px';

    const textarea = document.createElement('textarea');
    textarea.id = 'sessionNotes';
    textarea.rows = 4;
    textarea.placeholder = 'Sleep, fatigue, technique, soreness, sticking points...';
    textarea.value = state.sessionNotes || '';
    textarea.style.minHeight = '100px';
    textarea.style.resize = 'vertical';
    textarea.addEventListener('input', () => {
      state.sessionNotes = textarea.value;
      persistWithoutRender();
    });

    card.append(heading, textarea);
    actions.insertAdjacentElement('beforebegin', card);
  }

  const baseRenderTrain = renderTrain;
  renderTrain = function () {
    baseRenderTrain();
    injectSessionNotes();
  };

  window.addExerciseToWorkout = function (workoutIndex) {
    const nameInput = document.getElementById('newExerciseName');
    const prescriptionInput = document.getElementById('newExercisePrescription');
    if (!nameInput) return;

    const rawName = nameInput.value.trim();
    if (!rawName) {
      nameInput.focus();
      return;
    }

    const targetIndex = Number.isInteger(workoutIndex)
      ? workoutIndex
      : state.rotationIndex % state.rotation.length;
    const targetWorkout = state.rotation[targetIndex];
    if (!targetWorkout) return;

    targetWorkout.exercises.push({
      name: encodeText(rawName),
      prescription: encodeText(prescriptionInput?.value || '') || 'Custom exercise'
    });
    saveState();
    setTimeout(() => document.getElementById('newExerciseName')?.focus(), 0);
  };

  window.editWorkoutExercise = function (workoutIndex, exerciseIndex) {
    const workout = state.rotation[workoutIndex];
    const exercise = workout?.exercises?.[exerciseIndex];
    if (!exercise) return;

    const nextName = prompt('Exercise name', decodeText(exercise.name));
    if (nextName === null || !nextName.trim()) return;

    const nextPrescription = prompt('Notes / sets / rep target', decodeText(exercise.prescription || ''));
    if (nextPrescription === null) return;

    exercise.name = encodeText(nextName);
    exercise.prescription = encodeText(nextPrescription) || 'Custom exercise';
    saveState();
  };

  window.removeWorkoutExercise = function (workoutIndex, exerciseIndex) {
    const workout = state.rotation[workoutIndex];
    const exercise = workout?.exercises?.[exerciseIndex];
    if (!exercise) return;

    const exerciseName = decodeText(exercise.name);
    if (!confirm(`Remove ${exerciseName} from ${decodeText(workout.name)}?`)) return;
    workout.exercises.splice(exerciseIndex, 1);
    saveState();
  };

  const baseStartWorkout = window.startWorkout;
  window.startWorkout = function (index) {
    state.sessionNotes = '';
    persistWithoutRender();
    return baseStartWorkout(index);
  };

  const baseFinishWorkout = window.finishWorkout;
  window.finishWorkout = function () {
    const notes = state.sessionNotes || '';
    baseFinishWorkout();
    const completed = state.workoutLogs[state.workoutLogs.length - 1];
    if (completed) completed.notes = notes;
    state.sessionNotes = '';
    persistWithoutRender();
    renderAll();
  };

  const baseCancelWorkout = window.cancelWorkout;
  window.cancelWorkout = function () {
    state.sessionNotes = '';
    return baseCancelWorkout();
  };

  const baseAdvanceWorkout = window.advanceWorkout;
  window.advanceWorkout = function () {
    state.sessionNotes = '';
    return baseAdvanceWorkout();
  };

  const baseShiftTrainDate = window.shiftTrainDate;
  window.shiftTrainDate = function (days) {
    state.sessionNotes = '';
    return baseShiftTrainDate(days);
  };

  const baseSetTrainDate = window.setTrainDate;
  window.setTrainDate = function (value) {
    state.sessionNotes = '';
    return baseSetTrainDate(value);
  };

  const baseGoTrainToday = window.goTrainToday;
  window.goTrainToday = function () {
    state.sessionNotes = '';
    return baseGoTrainToday();
  };
})();
