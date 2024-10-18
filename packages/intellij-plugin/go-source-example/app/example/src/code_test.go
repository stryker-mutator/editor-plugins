package src

import "testing"

func TestIsReverse(t *testing.T) {
	t.Run("returns true when the second string is the reverse", func(t *testing.T) {
		input := "AA"

		reversed := Reverse(input)

		if reversed != "AA" {
			t.Errorf("reversed = %q, want %q", reversed, "AA")
		}
	})
}
