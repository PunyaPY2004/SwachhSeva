import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import PrimaryButton from "../components/PrimaryButton";
import { COLORS } from "../utils/constants";
import { submitComplaint, checkNearbyComplaints } from "../services/complaints";

export default function ReportIssueScreen({ navigation }) {
  const [photo, setPhoto] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Camera permission needed",
        "SwachhSeva needs camera access to photograph the civic issue. Please enable it in your phone's settings."
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhoto(result.assets[0]);
    }
  }

  async function pickFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Photo library permission needed",
        "SwachhSeva needs access to your photos to attach an existing picture. Please enable it in your phone's settings."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhoto(result.assets[0]);
    }
  }

  async function captureLocation() {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location permission needed",
          "SwachhSeva needs your location so officers know exactly where the issue is."
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch (err) {
      Alert.alert("Couldn't get location", "Make sure GPS/location services are turned on and try again.");
    } finally {
      setLocationLoading(false);
    }
  }

  async function handleSubmit() {
    if (!photo) {
      Alert.alert("Photo required", "Please take or select a photo of the issue.");
      return;
    }
    if (!location) {
      Alert.alert("Location required", "Please capture your location before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      // Check for existing nearby reports first — lets the citizen confirm
      // an existing complaint instead of accidentally filing a duplicate.
      const nearby = await checkNearbyComplaints(location);
      const confirmable = nearby.filter((c) => !c.already_upvoted_by_me);

      if (confirmable.length > 0) {
        setSubmitting(false);
        navigation.navigate("NearbyComplaints", {
          nearby: confirmable,
          pendingSubmission: { photo, location, description: description.trim() },
        });
        return;
      }

      await doSubmit();
    } catch (err) {
      Alert.alert("Something went wrong", err.message);
      setSubmitting(false);
    }
  }

  async function doSubmit() {
    try {
      const complaint = await submitComplaint({ photo, location, description: description.trim() });
      navigation.replace("SubmissionResult", { complaint });
    } catch (err) {
      Alert.alert("Submission failed", err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={styles.title}>Report a Civic Issue</Text>
      <Text style={styles.subtitle}>Add a photo, confirm the location, and describe what you see.</Text>

      <Text style={styles.label}>Photo</Text>
      {photo ? (
        <View>
          <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
          <TouchableOpacity onPress={() => setPhoto(null)} style={styles.retakeLink}>
            <Text style={styles.retakeText}>Remove photo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.photoButtons}>
          <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
            <Text style={styles.photoButtonIcon}>📷</Text>
            <Text style={styles.photoButtonText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoButton} onPress={pickFromGallery}>
            <Text style={styles.photoButtonIcon}>🖼️</Text>
            <Text style={styles.photoButtonText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.label}>Location</Text>
      {location ? (
        <View style={styles.locationBox}>
          <Text style={styles.locationText}>
            📍 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </Text>
          <TouchableOpacity onPress={captureLocation}>
            <Text style={styles.retakeText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <PrimaryButton
          title="📍  Capture My Location"
          onPress={captureLocation}
          loading={locationLoading}
          variant="secondary"
        />
      )}

      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        style={styles.textArea}
        value={description}
        onChangeText={setDescription}
        placeholder="e.g. Large pothole in the middle of the road, hard to see at night"
        multiline
        numberOfLines={4}
      />

      <View style={{ height: 24 }} />
      <PrimaryButton title="Submit Complaint" onPress={handleSubmit} loading={submitting} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 4,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 10,
    marginTop: 16,
  },
  photoButtons: {
    flexDirection: "row",
    gap: 12,
  },
  photoButton: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 24,
    alignItems: "center",
  },
  photoButtonIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  photoButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
  },
  photoPreview: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: COLORS.border,
  },
  retakeLink: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  retakeText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 13,
  },
  locationBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  locationText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "600",
  },
  textArea: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 90,
    textAlignVertical: "top",
  },
});
