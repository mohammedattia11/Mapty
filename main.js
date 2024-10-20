'use strict';
/**
 * unique ID generator library => let uid = new ShortUniqueId(); 
 * moving to selected workout based on two things
 *  1. matching the id of workout in workouts array and data-id of selected element form HTML this be like a bridge
 *  2. setView method with leaflet in their docs
 */
// let uid = new ShortUniqueId();

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// let map, mapHandler;
class Workout {
  id = new ShortUniqueId().stamp(32);
  date = new Date();
  constructor(coords, distance, duration) {
    this.distance = distance;
    this.duration = duration;
    this.coords = coords;
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type.toUpperCase()[0]}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this._calcPace();
    this._setDescription();
  }
  _calcPace() {
    return (this.pace = this.distance / this.duration);
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this._calcSpeed();
    this._setDescription();
  }
  _calcSpeed() {
    return (this.speed = this.distance / (this.duration / 60));
  }
}
class App {
  #map;
  #mapHandler;
  #workouts = [];
  constructor() {
    this._getPosition();
    form.addEventListener('submit', this._newWorkOut.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click' , this._moveToPopup.bind(this));
    this._getLocalStorage()
  }

  // * get position method
  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert("can't get ur location");
      }
    );
  }

  // * Load Map Method
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, 13);
    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png').addTo(
      this.#map
    );
    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(work=>this._renderMarker(work))
  }

  // * show form method
  _showForm(e) {
    this.#mapHandler = e;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  // * Hide Form
  _hideForm() {
    // prettier-ignore
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
    form.style.display = 'none'
    form.classList.add('hidden')
    setTimeout(()=>form.style.display = 'grid' , 1000)
  }

  // * toggle elevation method
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  // * new workout method
  _newWorkOut(e) {
    e.preventDefault();
    // ? get data from input field
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const cadence = +inputDuration.value;
    const elevation = +inputElevation.value;
    const { lat, lng } = this.#mapHandler.latlng;
    let workout;

    // ? Check if the data valid
    const CheckNumber = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const isPositive = (...inputs) => inputs.every(inp => inp > 0);
    if (type === 'running') {
      // prettier-ignore
      if (!CheckNumber(distance, duration, cadence) ||!isPositive(distance, duration, cadence)) return alert('invalid input');
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type === 'cycling') {
      // prettier-ignore
      if (!CheckNumber(distance, duration, elevation) ||!isPositive(distance, duration)) return alert('invalid input');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    this.#workouts.push(workout);
    
    // ? Render workout on map as marker
    this._renderMarker(workout);

    // ? render workout as a list
    this._renderWorkout(workout);

    // ? set local storage
    this._setLocalStorage()

    // ?Hide form + clear input field
    this._hideForm()
  }
  // * Render workout on map as marker Function

  _renderMarker(workout) {
    L.marker(workout.coords, { draggable: true })
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(`${workout.type === 'running'? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
      .openPopup();
  }

  // * render workout list
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <span class="delete-workout">&#x2715;</span>
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
        
    `;
    if (workout.type === 'running') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
        </li>
      `;
    }
    if (workout.type === 'cycling') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.speed}</span>
            <span class="workout__unit">m</span>
          </div> 
          </li>`;
    }
    form.insertAdjacentHTML('afterend', html);
}
  // * move the marker
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if(!workoutEl) return;
    const workout = this.#workouts.find(workout=> workout.id === workoutEl.dataset.id);
    this.#map.setView(workout.coords , 13 , {
      animate:true ,
      pan : {
        duration : 1
      }
    })
  }

  // * set local storage
  _setLocalStorage() {
    localStorage.setItem('workouts' , JSON.stringify(this.#workouts))
  }

  //* get local storage
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if(!data) return;
    this.#workouts = data;
    this.#workouts.forEach(work=>this._renderWorkout(work))
  }
}

const app = new App();
