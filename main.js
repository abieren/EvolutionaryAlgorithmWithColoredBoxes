function generateRandomInteger(lowestInclusive, highestInclusive)
{
	let range = highestInclusive - lowestInclusive;
	let result = Math.floor((Math.random() * range) + lowestInclusive);
	return result;
}

function Individual(r, g, b, width, height)
{
	this.r = r;
	this.g = g;
	this.b = b;
	this.width = width;
	this.height = height;
}

Individual.prototype.generate = function (config)
{
	this.r = generateRandomInteger(0, 255);
	this.g = generateRandomInteger(0, 255);
	this.b = generateRandomInteger(0, 255);
	this.height = generateRandomInteger(
		config.sizeMinBound, config.sizeMaxBound);
	this.width = generateRandomInteger(
		config.sizeMinBound, config.sizeMaxBound);
	return this;
}

function fitnessCompareFunction(config)
{
	let fun = (individualA, individualB) =>
	{
		if (individualA.evaluateFittnes(config) < individualB.evaluateFittnes(config)) return -1;
		if (individualA.evaluateFittnes(config) > individualB.evaluateFittnes(config)) return 1;
		if (individualA.evaluateFittnes(config) === individualB.evaluateFittnes(config)) return 0;
	}
	return fun;
}

Individual.prototype.evaluateFittnes = function (config)
{
	let deviationR = config.goalR - this.r;
	let deviationG = config.goalG - this.g;
	let deviationB = config.goalB - this.b;
	let deviationColor = Math.sqrt(
		deviationR * deviationR +
		deviationG * deviationG + 
		deviationB * deviationB);
	let deviationWidth = config.goalWidth - this.width;
	let deviationHeight = config.goalHeight - this.height;
	let deviationSize = Math.sqrt(
		deviationWidth * deviationWidth +
		deviationHeight * deviationHeight);
	let deviation = deviationColor + deviationSize;
	let penalty = -(deviation * deviation);
	return penalty;
}

Individual.prototype.crossover = function (otherIndividual, choice)
{
	// cross over
	let colorIndiv = choice === 0 ? this : otherIndividual;
	let sizeIndiv = choice === 0 ? otherIndividual : this;
	
	// generate offspring
	let offspring = new Individual(
		colorIndiv.r,
		colorIndiv.g,
		colorIndiv.b,
		sizeIndiv.width,
		sizeIndiv.height);
		
	return offspring;
}

Individual.prototype.randomCrossover = function (otherIndividual)
{
	let choice = generateRandomInteger(0, 1);
	let offspring = this.crossover(otherIndividual, choice);
	return offspring;
}

function mutationFunction(value, range, lowerBound, upperBound)
{
	let lower = Math.round(value - range / 2);
	let upper = Math.round(value + range / 2);
	let mutation = generateRandomInteger(lower, upper);
	mutation = mutation < lowerBound ? lowerBound : mutation;
	mutation = mutation > upperBound ? upperBound : mutation;
	return mutation;
}

Individual.prototype.mutate = function (config)
{
	this.r = mutationFunction(this.r, config.colorMutationRange, 0, 255);
	this.g = mutationFunction(this.g, config.colorMutationRange, 0, 255);
	this.b = mutationFunction(this.b, config.colorMutationRange, 0, 255);
	this.width = mutationFunction(this.width, config.sizeMutationRange, 
		config.sizeLowerBound, config.sizeUpperBound);
	this.height = mutationFunction(this.height, config.sizeMutationRange, 
		config.sizeLowerBound, config.sizeUpperBound);
	return this;
}

Individual.prototype.mate = function (config, otherIndividual)
{
	let offspring = this.randomCrossover(otherIndividual);
	offspring = offspring.mutate(config);
	return offspring;
}



/******************************************************************************/

function TableEntry(generation, population, terminated, offspring, goal)
{
	this.generation = generation;
	this.population = population;
	this.offspring = offspring;
	this.terminated = terminated;
	this.goal = goal
}

function Table()
{
	this.entries = {};
}

Table.prototype.insert = function (entry)
{
	this.entries[entry.generation] = entry;
}

Table.prototype.generateHTML = function (fromGeneration, toGeneration)
{
	let html = "";
	html += "<table>";
	html += this.generateHTML_body(fromGeneration, toGeneration);
	html += "</table>";
	return html;
}

Table.prototype.generateHTML_body = function (fromGeneration, toGeneration)
{
	let html = "";
	for (let i=fromGeneration; i<=toGeneration; i++)
	{
		html += this.generateHTML_bodyRow(i);
	}
	return html;
}

Table.prototype.generateHTML_bodyRow = function (generation)
{
	let html = "<tr>";
	// generation
	html += "<td>" + this.entries[generation].generation + "</td>";
	// population + terminated + offspring + goal
	let individuals = [];
	this.entries[generation].population.forEach((x)=>
	{
		individuals.push(x);
	});
	individuals.push(this.entries[generation].terminated);
	individuals.push(this.entries[generation].offspring);
	individuals.push(this.entries[generation].goal);
	
	individuals.forEach((x)=>
	{
		html += "<td>";
		if (x) {
			html += "<div style='width: "+x.width+
				"; height: "+x.height+
				"; background: rgb("+x.r+
				", "+x.g+
				", "+x.b+
				");'></div>";
		}
		html += "</td>";
	});
	
	html += "</tr>";
	return html;
}

/******************************************************************************/

function App()
{
}

App.prototype.configure = function ()
{
	let config = {};
	config = {};
	config.populationSize = 10;
	config.goalR = 255;
	config.goalG = 0;
	config.goalB = 0;
	config.goalWidth = 50;
	config.goalHeight = 50;
	config.sizeMinBound = 10;
	config.sizeMaxBound = 50;
	config.colorMutationRange = 10;
	config.sizeMutationRange = 10;
	
	this.config = config;
}

App.prototype.initializeApp = function ()
{
	this.configure();
	this.displayArea = document.getElementById("display-area");
	this.colorLabel = document.getElementById("color-label");
	this.sizeLabel = document.getElementById("size-label");
	
	this.initializeEvolution();
}

App.prototype.initializeEvolution = function ()
{
	this.table = new Table();
	this.goal = new Individual(
		this.config.goalR,
		this.config.goalG,
		this.config.goalB,
		this.config.goalWidth,
		this.config.goalHeight);		
	this.generation = 0;
	this.population = [];
	this.fittestIndividuals = null;
	this.unfittestIndividual = null;
	this.offspring = null;
	
	this.generateGenerationZero();
	this.recordPopulation();
	this.updateGUI();
}

App.prototype.generateGenerationZero = function ()
{
	let colorMinBound = 0;
	let colorMaxBound = 255;
	let sizeMinBound = this.config.sizeMinBound;
	let sizeMaxBound = this.config.sizeMaxBound;
	for (let i=0; i<this.config.populationSize; i++)
	{
		this.population.push(new Individual().generate(this.config));
	}
}

App.prototype.recordPopulation = function ()
{
	if (this.offspring !== null)
	{
		console.log("Offspring:", 
			this.offspring, 
			this.offspring.evaluateFittnes(this.config));
	}
	let entry = new TableEntry(this.generation, this.population,
		this.unfittestIndividual, this.offspring, this.goal);
	this.table.insert(entry);
}

App.prototype.updateGUI = function ()
{
	this.colorLabel.innerHTML = "rgb(" + 
		this.config.goalR + ", " + 
		this.config.goalG + ", " +
		this.config.goalB + ")";
	this.sizeLabel.innerHTML = this.config.goalWidth + "px(w) x " + 
		this.config.goalHeight + "px(h)";
	this.displayArea.innerHTML = this.table.generateHTML(0, this.generation);	
}

function copyArray(arr)
{
	let newArr = [];
	arr.forEach((x) =>
	{
		newArr.push(x);
	});
	return newArr;
}

App.prototype.step = function (interations)
{
	for (let i=0; i<interations; i++)
	{
		this.generation++;
		// create new array such that each array can be used to recordPopulation
		// progression of the evolution
		this.population = copyArray(this.population);
		
		// reproduction selection 
		this.population.sort(fitnessCompareFunction(this.config));
		this.fittestIndividuals = [
			this.population[this.config.populationSize-1], 
			this.population[this.config.populationSize-2]];
		
		// reproduction
		this.offspring = this.fittestIndividuals[0].mate(
			this.config, this.fittestIndividuals[1]);
		this.population.push(this.offspring);
		
		// survival selection
		this.population.sort(fitnessCompareFunction(this.config));
		this.unfittestIndividual = this.population[0];
		let index = this.population.indexOf(this.unfittestIndividual);
		this.population.splice(index, 1);
		
		this.recordPopulation()
	}
	this.updateGUI();
}

function validateIntegerFromUser(string, minBound, maxBound)
{
	let integer = parseFloat(string);
	if (isNaN(integer) || Math.floor(integer) !== integer)
	{
		alert("The number you entered is not valid. Please enter a whole number.");
		return false;
	}
	if (integer < minBound)
	{
		alert("The number you entered exceeds the lower bound of " + 
			minBound + ". Please enter a number above or equal to the lower bound.");
		return false;
	}
	if (integer > maxBound)
	{
		alert("The number you entered exceeds the upper bound of " + 
			maxBound + ". Please enter a number below or equal the upper bound.");
		return false;
	}
	return true;
}

App.prototype.setGoalColor = function ()
{
	let red = ""
	do {
		red = prompt("Please enter rgb red component in range from 0 to 255.", "0");
		if (red === null) return;
	} while (!validateIntegerFromUser(red, 0, 255));
	
	let green = "";
	do {
		green = prompt("Please enter rgb green component in range from 0 to 255.", "0");
		if (green === null) return;
	} while (!validateIntegerFromUser(green, 0, 255));
	
	let blue = "";
	do {
		blue = prompt("Please enter rgb blue component in range from 0 to 255.", "0");
		if (blue === null) return;
	} while (!validateIntegerFromUser(green, 0, 255));
	
	this.config.goalR = red;
	this.config.goalG = green;
	this.config.goalB = blue;
	
	this.initializeEvolution();
}

App.prototype.setGoalSize = function ()
{
	let width = "";
	do {
		width = prompt("Please enter width in pixels in range from 10 to 50.", 50);
		if (width === null) return;
	} while (!validateIntegerFromUser(width, this.config.sizeMinBound, this.config.sizeMaxBound));
	
	let height = "";
	do {
		height = prompt("Please enter height in pixels in range from 10 to 50.", 50);
		if (height === null) return;
	} while (!validateIntegerFromUser(height, this.config.sizeMinBound, this.config.sizeMaxBound));
	
	this.config.goalWidth = width;
	this.config.goalHeight = height;
	
	this.initializeEvolution();
}

/******************************************************************************/

function start()
{
	window.zzz = new App();
	zzz.initializeApp();
}