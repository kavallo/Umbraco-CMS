//used for the media picker dialog
angular.module("umbraco")
    .controller("Umbraco.Overlays.MediaPickerController",
        function ($scope, mediaResource, umbRequestHelper, entityResource, $log, mediaHelper, eventsService, treeService, $cookies, $element, $timeout) {

            var dialogOptions = $scope.model;

            $scope.onlyImages = dialogOptions.onlyImages;
            $scope.showDetails = dialogOptions.showDetails;
            $scope.multiPicker = (dialogOptions.multiPicker && dialogOptions.multiPicker !== "0") ? true : false;
            $scope.startNodeId = dialogOptions.startNodeId ? dialogOptions.startNodeId : -1;
            $scope.cropSize = dialogOptions.cropSize;

            $scope.model.selectedImages = [];

            //preload selected item
            $scope.target = undefined;
            if(dialogOptions.currentTarget){
                $scope.target = dialogOptions.currentTarget;
            }

            $scope.dragLeave = function(el, event){
                $scope.activeDrag = false;
            };

            $scope.dragEnter = function(el, event){
                $scope.activeDrag = true;
            };

            $scope.submitFolder = function() {

               if ($scope.newFolderName) {

                  mediaResource
                     .addFolder($scope.newFolderName, $scope.currentFolder.id)
                     .then(function(data) {

                        //we've added a new folder so lets clear the tree cache for that specific item
                        treeService.clearCache({
                           cacheKey: "__media", //this is the main media tree cache key
                           childrenOf: data.parentId //clear the children of the parent
                        });

                        $scope.gotoFolder(data);

                        $scope.showFolderInput = false;

                        $scope.newFolderName = "";

                     });

               } else {
                  $scope.showFolderInput = false;
               }

            };

            $scope.gotoFolder = function(folder) {

                if(!folder){
                    folder = {id: -1, name: "Media", icon: "icon-folder"};
                }

                if (folder.id > 0) {
                    entityResource.getAncestors(folder.id, "media")
                        .then(function(anc) {
                            // anc.splice(0,1);
                            $scope.path = _.filter(anc, function (f) {
                                return f.path.indexOf($scope.startNodeId) !== -1;
                            });
                        });
                }
                else {
                    $scope.path = [];
                }

                //mediaResource.rootMedia()
                mediaResource.getChildren(folder.id)
                   .then(function(data) {
                      $scope.searchTerm = "";
                      $scope.images = data.items ? data.items : [];

                      // set already selected images to selected
                      for (var folderImageIndex = 0; folderImageIndex < $scope.images.length; folderImageIndex++) {

                         var folderImage = $scope.images[folderImageIndex];
                         var imageIsSelected = false;

                         for (var selectedImageIndex = 0; selectedImageIndex < $scope.model.selectedImages.length; selectedImageIndex++) {
                            var selectedImage = $scope.model.selectedImages[selectedImageIndex];

                            if(folderImage.key === selectedImage.key) {
                               imageIsSelected = true;
                            }
                         }

                         if(imageIsSelected) {
                            folderImage.cssclass = "selected";
                         }
                      }

                   });

                $scope.currentFolder = folder;
            };


            $scope.clickHandler = function(image, ev, select) {
                ev.preventDefault();

                if (image.isFolder && !select) {
                    $scope.gotoFolder(image);
                }else{
                    eventsService.emit("dialogs.mediaPicker.select", image);

                    //we have 3 options add to collection (if multi) show details, or submit it right back to the callback
                    if ($scope.multiPicker) {
                        selectImage(image);
                    }else if($scope.showDetails) {

                        $scope.target = image;
                        $scope.target.url = mediaHelper.resolveFile(image);

                        $scope.openDetailsDialog();

                    }else{
                       $scope.model.selectedImages.push(image);
                       $scope.model.submit($scope.model);
                    }
                }
            };

            function selectImage(image) {

               if($scope.model.selectedImages.length > 0) {

                  var selectImage = false;

                  for (var i = 0; i < $scope.model.selectedImages.length; i++) {

                     var selectedImage = $scope.model.selectedImages[i];

                     if(image.key === selectedImage.key) {
                        image.cssclass = "";
                        $scope.model.selectedImages.splice(i, 1);
                        selectImage = false;
                     } else {
                        selectImage = true;
                     }

                  }

                  if(selectImage) {
                     image.cssclass = "selected";
                     $scope.model.selectedImages.push(image);
                  }

               } else {
                  $scope.model.selectedImages.push(image);
                  image.cssclass = "selected";
               }

            }

            $scope.onUploadComplete = function () {
                $scope.gotoFolder($scope.currentFolder);
            };

            $scope.onFilesQueue = function(){
                $scope.activeDrag = false;
            };

            //default root item
            if(!$scope.target){
                $scope.gotoFolder({ id: $scope.startNodeId, name: "Media", icon: "icon-folder" });
            }

            $scope.openDetailsDialog = function() {

               $scope.mediaPickerDetailsOverlay = {};
               $scope.mediaPickerDetailsOverlay.show = true;

               $scope.mediaPickerDetailsOverlay.submit = function(model) {

                  $scope.model.selectedImages.push($scope.target);
                  $scope.model.submit($scope.model);

                  $scope.mediaPickerDetailsOverlay.show = false;
                  $scope.mediaPickerDetailsOverlay = null;

               };

               $scope.mediaPickerDetailsOverlay.close = function(oldModel) {
                  $scope.mediaPickerDetailsOverlay.show = false;
                  $scope.mediaPickerDetailsOverlay = null;
               };

            };


        });
