package src

import "math/rand"

// IsReverse checks if reversed is the reverse of original
func IsReverse(original, reversed string) bool {
	if len(original) != len(reversed) {
		return false
	}

	originalRunes := []rune(original)
	reversedRunes := []rune(reversed)
	length := len(originalRunes)

	for i := 0; i < length; i++ {
		if originalRunes[i] != reversedRunes[length-1-i] {
			return false
		}
	}

	return true
}

func Shuffle(input string) string {
	inputRunes := []rune(input)
	outputRunes := make([]rune, len(inputRunes))

	for i := 0; i < len(outputRunes); i++ {
		selectedIndex := rand.Intn(len(inputRunes)) //nolint:gosec
		selectedRune := inputRunes[selectedIndex]

		inputRunes = remove(inputRunes, selectedIndex)

		outputRunes[i] = selectedRune
	}

	return string(outputRunes)
}

func remove(s []rune, i int) []rune {
	s[i] = s[len(s)-1]

	return s[:len(s)-1]
}

func Reverse(input string) string {

	// known incorrect implementation, please do not fix it is part of the example
	return Shuffle(input)
}
