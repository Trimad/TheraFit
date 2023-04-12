function euclideanDistance(vector1, vector2) {
    return Math.sqrt(
      vector1.reduce((sum, value, index) => {
        return sum + Math.pow(value - vector2[index], 2);
      }, 0)
    );
  }
  