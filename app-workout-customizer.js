(function () {
  const baseRenderTrain = renderTrain;

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

  function currentWorkoutIndex() {
    return state.rotationIndex % state.rotation.length;
  }

  function enhanceWorkoutCustomization() {
    const list = document.getElementById('exerciseList');
    if (!list) return;

    const workoutIndex = currentWorkoutIndex();
    const workout = state.rotation[workoutIndex];

    list.querySelectorAll('.exercise').forEach((exerciseEl, exerciseIndex) => {
      const setGrid = exerciseEl.querySelector('.set-grid');
      if (!setGrid) return;

      const actions = document.createElement('div');
      actions.className = 'row wrap';
      actions.style.marginTop = '8px';

      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'btn ghost';
      editButton.textContent = 'Edit exercise';
      editButton.addEventListener('click', () => window.editWorkoutExercise(exerciseIndex));

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'btn ghost';
      removeButton.textContent = 'Remove';
      removeButton.addEventListener('click', () => window.removeWorkoutExercise(exerciseIndex));

      actions.append(editButton, removeButton);
      setGrid.insertAdjacentElement('beforebegin', actions);
    });

    const customizer = document.createElement('div');
    customizer.className = 'day';
    customizer.style.marginTop = '14px';

    const headingRow = document.createElement('div');
    headingRow.className = 'row between wrap';

    const heading = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = 'Customize workout exercises';
    const subtitle = document.createElement('div');
    subtitle.className = 'muted small';
    subtitle.textContent = 'Add any exercise you want to one specific workout. Changes are saved permanently in this browser.';
    heading.append(title, subtitle);

    const count = document.createElement('span');
    count.className = 'badge';
    count.textContent = `${workout.exercises.length} exercises in ${decodeText(workout.name)}`;
    headingRow.append(heading, count);

    const controls = document.createElement('div');
    controls.className = 'set-grid';
    controls.style.marginTop = '12px';

    const workoutSelect = document.createElement('select');
    workoutSelect.id = 'customWorkoutTarget';
    state.rotation.forEach((item, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `${decodeText(item.name)} (${item.exercises.length})`;
      workoutSelect.appendChild(option);
    });
    workoutSelect.value = String(
      Number.isInteger(window._customWorkoutTarget) ? window._customWorkoutTarget : workoutIndex
    );
    workoutSelect.addEventListener('change', () => {
      window._customWorkoutTarget = Number(workoutSelect.value);
    });

    const nameInput = document.createElement('input');
    nameInput.id = 'newExerciseName';
    nameInput.type = 'text';
    nameInput.placeholder = 'Exercise name — type anything';
    nameInput.autocomplete = 'off';

    const prescriptionInput = document.createElement('input');
    prescriptionInput.id = 'newExercisePrescription';
    prescriptionInput.type = 'text';
    prescriptionInput.placeholder = 'Notes / sets / rep target (optional)';
    prescriptionInput.autocomplete = 'off';

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'btn primary';
    addButton.textContent = 'Add exercise';
    addButton.addEventListener('click', window.addExerciseToWorkout);

    [nameInput, prescriptionInput].forEach((input) => {
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') window.addExerciseToWorkout();
      });
    });

    controls.append(workoutSelect, nameInput, prescriptionInput, addButton);
    customizer.append(headingRow, controls);
    list.insertAdjacentElement('afterend', customizer);
  }

  renderTrain = function () {
    baseRenderTrain();
    enhanceWorkoutCustomization();
  };

  window.addExerciseToWorkout = function () {
    const nameInput = document.getElementById('newExerciseName');
    const prescriptionInput = document.getElementById('newExercisePrescription');
    const select = document.getElementById('customWorkoutTarget');
    if (!nameInput || !select) return;

    const rawName = nameInput.value.trim();
    if (!rawName) {
      nameInput.focus();
      return;
    }

    const targetIndex = Number(select.value);
    const targetWorkout = state.rotation[targetIndex];
    if (!targetWorkout) return;

    targetWorkout.exercises.push({
      name: encodeText(rawName),
      prescription: encodeText(prescriptionInput?.value || '') || 'Custom exercise'
    });

    window._customWorkoutTarget = targetIndex;
    saveState();
    setTimeout(() => document.getElementById('newExerciseName')?.focus(), 0);
  };

  window.editWorkoutExercise = function (exerciseIndex) {
    const workout = state.rotation[currentWorkoutIndex()];
    const exercise = workout?.exercises?.[exerciseIndex];
    if (!exercise) return;

    const nextName = prompt('Exercise name', decodeText(exercise.name));
    if (nextName === null) return;
    if (!nextName.trim()) return;

    const nextPrescription = prompt(
      'Notes / sets / rep target',
      decodeText(exercise.prescription || '')
    );
    if (nextPrescription === null) return;

    exercise.name = encodeText(nextName);
    exercise.prescription = encodeText(nextPrescription) || 'Custom exercise';
    saveState();
  };

  window.removeWorkoutExercise = function (exerciseIndex) {
    const workout = state.rotation[currentWorkoutIndex()];
    const exercise = workout?.exercises?.[exerciseIndex];
    if (!exercise) return;

    const exerciseName = decodeText(exercise.name);
    if (!confirm(`Remove ${exerciseName} from ${decodeText(workout.name)}?`)) return;

    workout.exercises.splice(exerciseIndex, 1);
    saveState();
  };
})();
