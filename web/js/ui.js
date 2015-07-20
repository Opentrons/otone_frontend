/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

var currentTab = 'deck';

function changeTab(tabName) {
	if(tabName!=currentTab) {
		try {
			document.getElementById(currentTab+'Link').classList.remove('active');
			document.getElementById(currentTab+'_container').style.display = 'none';
		}
		catch(e){
			console.log(e);
		}

		currentTab = tabName;

		try {
			document.getElementById(currentTab+'Link').classList.add('active');
			document.getElementById(currentTab+'_container').style.display = 'block';
		}
		catch(e){
			console.log(e);
		}
	}
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

var debug_showing = false;

function toggleDebug(source){
	debug_showing = !debug_showing;

	if(debug_showing) {
		document.getElementById('debug_container').style.display = 'block';
		source.innerHTML = '[X] Close';
	}
	else {
		document.getElementById('debug_container').style.display = 'none';
		source.innerHTML = 'Debug Monitor';
	}
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

window.addEventListener('load',function(){
	var parent_ab = document.getElementById('stepSize_ab');
	parent_ab.selectedStep = parent_ab.children[0];
	parent_ab.value = parent_ab.selectedStep.value;
	parent_ab.selectedStep.classList.add('active');

	var parent_xyz = document.getElementById('stepSize_xyz');
	parent_xyz.selectedStep = parent_xyz.children[1];
	parent_xyz.value = parent_xyz.selectedStep.value;
	parent_xyz.selectedStep.classList.add('active');
});

function changeStepSize(source, axisLabel, value) {

	var buttonParent = document.getElementById('stepSize_'+axisLabel);

	buttonParent.value = value;

	if(buttonParent.selectedStep) {
		buttonParent.selectedStep.classList.remove('active');
	}

	buttonParent.selectedStep = source;

	buttonParent.selectedStep.classList.add('active');

}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////


window.addEventListener ('load', function () {
	changeStepSize(document.getElementById('defaultXYZStepSizeBtn'),'xyz',20);
	changeStepSize(document.getElementById('defaultABStepSizeBtn'),'ab',2);
});

//document.getElementById('defaultXYZStepSizeBtn').click();
//document.getElementById('defaultABStepSizeBtn').click();