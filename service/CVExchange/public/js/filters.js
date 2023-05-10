//<script>

function filterImage() {
    const fileInput = document.uploadForm.profilePicture

    if (!(/\.(jpg|jpeg|png)$/i).test(fileInput.value)) {              
        alert('Please select an image file')
        fileInput.value = ''
    }
    if(fileInput.files[0].size > 5000000) {
        alert('Please select a file under 5MB')
        fileInput.value = ''
    }
}

//</script>

// works for the following form:

/*
<form name="uploadForm">
<input type="file" name="profilePicture" onchange="filterEnding();"/>
</form>
*/